"""
Header extraction service for uploaded files.
Supports: .xlsx (openpyxl), .xls (xlrd), .csv (stdlib)
Extracts FIRST ROW ONLY as column headers.
"""
import csv
import io
import os

import openpyxl
import xlrd


ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


class HeaderExtractionError(Exception):
    """Raised when header extraction fails."""
    pass


def get_file_extension(filename):
    """Return lowercase file extension without dot."""
    _, ext = os.path.splitext(filename)
    return ext.lower().lstrip('.')


def validate_file(filename, file_obj):
    """Validate file extension and size."""
    ext = get_file_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HeaderExtractionError(
            f'Unsupported format: .{ext}. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        )

    # Check file size
    file_obj.seek(0, 2)  # Seek to end
    size = file_obj.tell()
    file_obj.seek(0)  # Reset
    if size > MAX_FILE_SIZE:
        raise HeaderExtractionError(
            f'File too large ({size // (1024*1024)}MB). Maximum: {MAX_FILE_SIZE // (1024*1024)}MB'
        )

    return ext


def extract_headers_xlsx(file_obj):
    """Extract headers from xlsx file using openpyxl (read-only mode)."""
    try:
        wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
        ws = wb.active
        headers = []
        for row in ws.iter_rows(min_row=1, max_row=1, values_only=True):
            headers = [str(cell) if cell is not None else '' for cell in row]
            break
        wb.close()
        return headers
    except Exception as e:
        raise HeaderExtractionError(f'Failed to read xlsx file: {str(e)}')


def extract_headers_xls(file_obj):
    """Extract headers from xls (97-2003) file using xlrd."""
    try:
        content = file_obj.read()
        wb = xlrd.open_workbook(file_contents=content)
        ws = wb.sheet_by_index(0)
        if ws.nrows == 0:
            return []
        headers = [str(ws.cell_value(0, col)) for col in range(ws.ncols)]
        return headers
    except Exception as e:
        raise HeaderExtractionError(f'Failed to read xls file: {str(e)}')


def extract_headers_csv(file_obj):
    """Extract headers from CSV file."""
    try:
        # Handle both binary and text mode
        content = file_obj.read()
        if isinstance(content, bytes):
            # Try utf-8-sig first to automatically strip BOM
            try:
                content = content.decode('utf-8-sig')
            except UnicodeDecodeError:
                content = content.decode('utf-8')
        else:
            # Strip BOM from text content if present
            content = content.lstrip('\ufeff')
        reader = csv.reader(io.StringIO(content))
        headers = next(reader, [])
        # Strip whitespace from headers
        headers = [h.strip() for h in headers]
        return headers
    except Exception as e:
        raise HeaderExtractionError(f'Failed to read csv file: {str(e)}')


def extract_headers(file_obj, filename):
    """
    Main entry point: validate file and extract headers from first row.

    Returns dict: { headers: [...], field_count: N, file_format: "xlsx" }
    """
    ext = validate_file(filename, file_obj)

    extractors = {
        'xlsx': extract_headers_xlsx,
        'xls': extract_headers_xls,
        'csv': extract_headers_csv,
    }

    raw_headers = extractors[ext](file_obj)

    # Keep only non-blank headers (skip empty/whitespace-only cells)
    headers = [h for h in raw_headers if h.strip()]

    return {
        'headers': headers,
        'field_count': len(headers),
        'file_format': ext,
    }
