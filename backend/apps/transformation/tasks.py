"""
Celery tasks for ETL file processing.
- file_sense_scan: Periodic task that scans trfm_inbound for new files matching active packages.
- process_inbound_file: Processes a single inbound file through its mapped package.
"""
import csv
import fnmatch
import io
import os
import shutil
from datetime import datetime

import openpyxl
import xlrd

from celery import shared_task
from django.conf import settings
from django.utils import timezone


@shared_task(name='transformation.file_sense_scan')
def file_sense_scan():
    """
    Scan trfm_inbound directory for files matching active package patterns.
    For each match, dispatch process_inbound_file task.
    """
    from .models import Package

    inbound_dir = settings.TRFM_INBOUND_DIR

    if not os.path.exists(inbound_dir):
        return {'scanned': 0, 'matched': 0}

    files = [f for f in os.listdir(inbound_dir) if os.path.isfile(os.path.join(inbound_dir, f))]
    if not files:
        return {'scanned': 0, 'matched': 0}

    # Get all active/running packages with mappings
    active_packages = Package.objects.filter(
        status__in=[Package.Status.ACTIVE, Package.Status.RUNNING],
        mapping_status=Package.MappingStatus.MAPPED,
    ).select_related('source_file', 'canvas_file')

    matched = 0
    for filename in files:
        for package in active_packages:
            if fnmatch.fnmatch(filename.lower(), package.file_pattern.lower()):
                # Dispatch processing task
                filepath = os.path.join(inbound_dir, filename)
                process_inbound_file.delay(package.id, filepath, filename)
                matched += 1
                break  # One file matches one package

    return {'scanned': len(files), 'matched': matched}


@shared_task(name='transformation.process_inbound_file', bind=True, max_retries=3)
def process_inbound_file(self, package_id, filepath, original_filename):
    """
    Process a single inbound file:
    1. Read the source file
    2. Apply field mappings (source_header → canvas_header)
    3. Write transformed output to trfm_outbound
    4. Archive/move the processed inbound file
    """
    from .models import Package, FieldMapping

    try:
        package = Package.objects.select_related(
            'source_file', 'canvas_file'
        ).get(pk=package_id)
    except Package.DoesNotExist:
        return {'error': f'Package {package_id} not found'}

    if not os.path.exists(filepath):
        return {'error': f'File not found: {filepath}'}

    # Mark package as running
    package.status = Package.Status.RUNNING
    package.save(update_fields=['status', 'updated_at'])

    try:
        # Get field mappings
        mappings = list(
            package.field_mappings.all()
            .order_by('order')
            .values_list('source_header', 'canvas_header')
        )

        if not mappings:
            return {'error': 'No field mappings configured'}

        # Read source data
        source_data = _read_file(filepath, original_filename)

        if not source_data:
            return {'error': 'No data in source file'}

        # Transform: remap columns
        transformed = _transform_data(source_data, mappings)

        # Generate output filename: <prefix><ddmmyyyyhhmmss>.<format>
        now = timezone.localtime()
        timestamp = now.strftime('%d%m%Y%H%M%S')
        output_filename = f'{package.output_prefix}{timestamp}.{package.output_format}'
        output_path = os.path.join(settings.TRFM_OUTBOUND_DIR, output_filename)

        # Write output
        _write_file(output_path, transformed, package.output_format)

        # Move processed file to archive (subfolder in inbound)
        archive_dir = os.path.join(settings.TRFM_INBOUND_DIR, '_processed')
        os.makedirs(archive_dir, exist_ok=True)
        archived_name = f'{timestamp}_{original_filename}'
        shutil.move(filepath, os.path.join(archive_dir, archived_name))

        # Restore package status to active
        package.status = Package.Status.ACTIVE
        package.save(update_fields=['status', 'updated_at'])

        return {
            'success': True,
            'output_file': output_filename,
            'rows_processed': len(transformed) - 1,  # Exclude header row
        }

    except Exception as exc:
        # Restore status on failure
        package.status = Package.Status.ACTIVE
        package.save(update_fields=['status', 'updated_at'])
        raise self.retry(exc=exc, countdown=30)


def _read_file(filepath, filename):
    """Read file into list of dicts based on file extension."""
    ext = os.path.splitext(filename)[1].lower().lstrip('.')

    if ext == 'csv':
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            return list(reader)

    elif ext == 'xlsx':
        wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
        if not rows:
            return []
        headers = [str(h) if h else '' for h in rows[0]]
        return [dict(zip(headers, row)) for row in rows[1:]]

    elif ext == 'xls':
        wb = xlrd.open_workbook(filepath)
        ws = wb.sheet_by_index(0)
        if ws.nrows < 2:
            return []
        headers = [str(ws.cell_value(0, c)) for c in range(ws.ncols)]
        return [
            dict(zip(headers, [ws.cell_value(r, c) for c in range(ws.ncols)]))
            for r in range(1, ws.nrows)
        ]

    return []


def _transform_data(source_data, mappings):
    """Apply field mappings to transform source data to canvas schema."""
    # mappings is list of (source_header, canvas_header)
    canvas_headers = [m[1] for m in mappings]
    transformed = [canvas_headers]  # Header row

    for row in source_data:
        new_row = []
        for source_h, canvas_h in mappings:
            value = row.get(source_h, '')
            if value is None:
                value = ''
            new_row.append(value)
        transformed.append(new_row)

    return transformed


def _write_file(output_path, data, fmt):
    """Write transformed data to output file in the specified format."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if fmt == 'csv':
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerows(data)

    elif fmt == 'xlsx':
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Transformed'
        for row in data:
            ws.append(row)
        wb.save(output_path)

    elif fmt == 'xls':
        import xlwt
        wb = xlwt.Workbook()
        ws = wb.add_sheet('Transformed')
        for r, row in enumerate(data):
            for c, val in enumerate(row):
                ws.write(r, c, val)
        wb.save(output_path)
