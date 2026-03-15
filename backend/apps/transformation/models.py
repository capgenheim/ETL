import os
from django.conf import settings
from django.db import models


def upload_path(instance, filename):
    """Store files under media/uploads/<file_type>/<filename>"""
    return os.path.join('uploads', instance.file_type, filename)


class UploadedFile(models.Model):
    """Stores uploaded source/canvas files with extracted header metadata."""

    FILE_TYPE_CHOICES = [
        ('source', 'Source File'),
        ('canvas', 'Canvas File'),
    ]

    FORMAT_CHOICES = [
        ('xlsx', 'Excel (xlsx)'),
        ('xls', 'Excel 97-2003 (xls)'),
        ('csv', 'CSV'),
    ]

    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, db_index=True)
    file = models.FileField(upload_to=upload_path, blank=True, null=True)
    original_filename = models.CharField(max_length=255)
    file_format = models.CharField(max_length=10, choices=FORMAT_CHOICES)
    headers_json = models.JSONField(default=list, help_text='Extracted column headers')
    field_count = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_files',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Uploaded File'
        verbose_name_plural = 'Uploaded Files'

    def __str__(self):
        return f'{self.original_filename} ({self.file_type})'


class Package(models.Model):
    """ETL transformation package — defines how source files are mapped to canvas output."""

    class Status(models.TextChoices):
        INACTIVE = 'inactive', 'Inactive'
        ACTIVE = 'active', 'Active'
        RUNNING = 'running', 'Running'
        PAUSED = 'paused', 'Paused'

    class MappingStatus(models.TextChoices):
        UNMAPPED = 'unmapped', 'Unmapped'
        MAPPED = 'mapped', 'Mapped'

    class BatchMode(models.TextChoices):
        INSTANT = 'instant', 'Instant (File Sense)'
        SCHEDULED = 'scheduled', 'Scheduled'

    FORMAT_CHOICES = [
        ('xlsx', 'Excel (xlsx)'),
        ('xls', 'Excel 97-2003 (xls)'),
        ('csv', 'CSV'),
    ]

    name = models.CharField(max_length=255, help_text='Package display name')
    file_pattern = models.CharField(
        max_length=255,
        help_text='Glob pattern for matching inbound files, e.g. MBB_*.csv',
    )
    source_file = models.ForeignKey(
        UploadedFile,
        on_delete=models.PROTECT,
        related_name='packages_as_source',
        limit_choices_to={'file_type': 'source'},
        help_text='Source file whose headers define the input schema',
    )
    canvas_file = models.ForeignKey(
        UploadedFile,
        on_delete=models.PROTECT,
        related_name='packages_as_canvas',
        limit_choices_to={'file_type': 'canvas'},
        help_text='Canvas file whose headers define the output schema',
    )
    input_format = models.CharField(
        max_length=10, choices=FORMAT_CHOICES, default='csv',
        help_text='Expected format of inbound source files',
    )
    output_format = models.CharField(
        max_length=10, choices=FORMAT_CHOICES, default='csv',
        help_text='Format of the transformed output file',
    )
    output_prefix = models.CharField(
        max_length=255,
        help_text='Prefix for output filename, e.g. mbbprocess_',
    )
    batch_mode = models.CharField(
        max_length=10, choices=BatchMode.choices, default=BatchMode.INSTANT,
    )
    batch_interval_minutes = models.PositiveIntegerField(
        default=0,
        help_text='Interval in minutes (1–1440) when batch_mode is scheduled',
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.INACTIVE, db_index=True,
    )
    mapping_status = models.CharField(
        max_length=10, choices=MappingStatus.choices, default=MappingStatus.UNMAPPED,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='packages',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Package'
        verbose_name_plural = 'Packages'

    def __str__(self):
        return f'{self.name} ({self.get_status_display()})'


class FieldMapping(models.Model):
    """Maps a source column header to a canvas column header within a package.
    Supports direct mapping, conditional (IF/ELSE) logic, and constant values.
    """

    class MappingType(models.TextChoices):
        DIRECT = 'direct', 'Direct Mapping'
        CONDITION = 'condition', 'Conditional (IF/ELSE)'
        CONSTANT = 'constant', 'Constant Value'

    package = models.ForeignKey(
        Package,
        on_delete=models.CASCADE,
        related_name='field_mappings',
    )
    source_header = models.CharField(
        max_length=255, blank=True, default='',
        help_text='Column from source file (used for direct mapping)',
    )
    canvas_header = models.CharField(max_length=255, help_text='Column from canvas file')
    order = models.PositiveIntegerField(default=0, help_text='Display/export order')

    # ── Mapping logic ──
    mapping_type = models.CharField(
        max_length=10, choices=MappingType.choices, default=MappingType.DIRECT,
    )
    has_condition = models.BooleanField(
        default=False,
        help_text='Toggle: enable conditional logic for this mapping',
    )
    condition_json = models.JSONField(
        null=True, blank=True, default=None,
        help_text='''Structured condition rules. Example:
        {
            "condition_type": "if_else",
            "source_field": "Debit (DR)",
            "operator": ">",
            "compare_value": "0",
            "then_source": "Debit (DR)",
            "else_source": "Credit (CR)"
        }
        Operators: >, <, >=, <=, ==, !=, contains, not_empty, is_empty''',
    )
    constant_value = models.CharField(
        max_length=500, blank=True, default='',
        help_text='Fixed value to output when mapping_type is constant',
    )

    class Meta:
        ordering = ['order']
        unique_together = [('package', 'canvas_header')]
        verbose_name = 'Field Mapping'
        verbose_name_plural = 'Field Mappings'

    def __str__(self):
        if self.mapping_type == self.MappingType.CONSTANT:
            return f'"{self.constant_value}" → {self.canvas_header}'
        if self.has_condition:
            return f'IF(...) → {self.canvas_header}'
        return f'{self.source_header} → {self.canvas_header}'


class FileTag(models.Model):
    """Tags for categorising processed inbound files."""
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(
        max_length=7, default='#40c4ff',
        help_text='Hex colour code for the tag chip',
    )
    auto_created = models.BooleanField(
        default=False,
        help_text='True if the tag was generated automatically by the system',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'File Tag'
        verbose_name_plural = 'File Tags'

    def __str__(self):
        return self.name


class InboundFileLog(models.Model):
    """Stores processed inbound files in PostgreSQL after successful transformation."""

    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'

    class RunType(models.TextChoices):
        INSTANT = 'instant', 'Instant (File Sense)'
        SCHEDULED = 'scheduled', 'Scheduled (Batch)'
        ADHOC = 'adhoc', 'Ad-hoc (Manual)'
        SWIFT = 'swift', 'SWIFT Message'

    package = models.ForeignKey(
        Package,
        on_delete=models.CASCADE,
        related_name='inbound_logs',
        null=True, blank=True,
    )
    original_filename = models.CharField(max_length=500)
    file_content = models.BinaryField(
        help_text='Raw binary content of the processed inbound file',
    )
    file_size = models.PositiveIntegerField(default=0, help_text='File size in bytes')
    file_format = models.CharField(max_length=10, default='csv')
    output_filename = models.CharField(
        max_length=500, blank=True, default='',
        help_text='Name of the generated output file in trfm_outbound',
    )
    rows_processed = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SUCCESS)
    error_message = models.TextField(blank=True, default='')
    run_type = models.CharField(
        max_length=10, choices=RunType.choices, default=RunType.INSTANT,
        help_text='How the run was triggered: instant (file sense), scheduled (batch), adhoc (manual), swift (SWIFT message)',
    )
    tags = models.ManyToManyField(FileTag, blank=True, related_name='file_logs')
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-processed_at']
        verbose_name = 'Inbound File Log'
        verbose_name_plural = 'Inbound File Logs'

    def __str__(self):
        return f'{self.original_filename} → {self.output_filename} ({self.get_status_display()})'


class SwiftParameter(models.Model):
    """
    SWIFT message parameter definitions — covers MT, MX/pacs, BIC, TRAD fields.
    Used as a master reference for parsing and validating SWIFT messages.
    """

    class Category(models.TextChoices):
        MT = 'MT', 'MT (FIN)'
        MX = 'MX', 'MX (ISO 20022)'
        BIC = 'BIC', 'BIC Codes'
        GENERAL = 'GENERAL', 'General'

    class DataType(models.TextChoices):
        TEXT = 'TEXT', 'Text'
        AMOUNT = 'AMOUNT', 'Amount'
        DATE = 'DATE', 'Date'
        DATETIME = 'DATETIME', 'Date/Time'
        BIC_TYPE = 'BIC', 'BIC Code'
        ACCOUNT = 'ACCOUNT', 'Account Number'
        CURRENCY = 'CURRENCY', 'Currency Code'
        CODE = 'CODE', 'Code/Indicator'
        NARRATIVE = 'NARRATIVE', 'Narrative/Free Text'
        QUANTITY = 'QUANTITY', 'Quantity'
        RATE = 'RATE', 'Rate/Price'
        ISIN = 'ISIN', 'ISIN Code'
        REFERENCE = 'REFERENCE', 'Reference'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    category = models.CharField(
        max_length=10, choices=Category.choices, db_index=True,
        help_text='Parameter category: MT, MX, BIC, TRAD, or GENERAL',
    )
    message_type = models.CharField(
        max_length=30, db_index=True,
        help_text='Message type, e.g. MT103, MT540, pacs.008, camt.053',
    )
    field_tag = models.CharField(
        max_length=30,
        help_text='SWIFT field tag, e.g. :20:, :32A:, :50K:, MsgId, BIC',
    )
    field_name = models.CharField(
        max_length=255,
        help_text='Human-readable name, e.g. Transaction Reference',
    )
    description = models.TextField(
        blank=True, default='',
        help_text='Detailed description of the field purpose and usage',
    )
    data_type = models.CharField(
        max_length=12, choices=DataType.choices, default=DataType.TEXT,
    )
    is_mandatory = models.BooleanField(
        default=False,
        help_text='Whether this field is mandatory in the message',
    )
    max_length = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Maximum allowed characters',
    )
    format_pattern = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Format notation, e.g. 16x, 6!n, 3!a15d, //YYYY-MM-DD',
    )
    sample_value = models.CharField(
        max_length=255, blank=True, default='',
        help_text='Example value for reference',
    )
    options_json = models.JSONField(
        default=dict, blank=True,
        help_text='Additional metadata: allowed_values, sub_fields, qualifiers, etc.',
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE, db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='swift_parameters',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'message_type', 'field_tag']
        verbose_name = 'SWIFT Parameter'
        verbose_name_plural = 'SWIFT Parameters'
        unique_together = ['category', 'message_type', 'field_tag']

    def __str__(self):
        return f'{self.message_type} {self.field_tag} — {self.field_name}'


class SwiftMessage(models.Model):
    """
    Stores a processed SWIFT FIN message with raw content, parsed JSON,
    metadata, and reference to the generated Excel file.
    """

    class Status(models.TextChoices):
        PROCESSED = 'processed', 'Processed'
        FAILED = 'failed', 'Failed'

    message_type = models.CharField(max_length=10, help_text='e.g. MT541')
    message_type_description = models.CharField(max_length=200, blank=True, default='')
    sender_bic = models.CharField(max_length=12, blank=True, default='')
    receiver_bic = models.CharField(max_length=12, blank=True, default='')
    reference = models.CharField(max_length=100, blank=True, default='')
    raw_content = models.TextField(help_text='Full original message text')
    parsed_json = models.JSONField(default=dict, blank=True, help_text='Structured parsed fields')
    original_filename = models.CharField(max_length=255)
    excel_filename = models.CharField(max_length=255, blank=True, default='')
    source_file_content = models.BinaryField(null=True, blank=True, help_text='Raw file bytes')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PROCESSED)
    error_message = models.TextField(blank=True, default='')
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'SWIFT Message'
        verbose_name_plural = 'SWIFT Messages'

    def __str__(self):
        return f'{self.message_type} — {self.reference} ({self.original_filename})'


class SwiftPackage(models.Model):
    """
    SWIFT processing package — defines which message types to accept,
    output format, and processing mode (instant/batch).
    """

    class OutputFormat(models.TextChoices):
        XLSX = 'xlsx', 'Excel (XLSX)'
        CSV = 'csv', 'CSV'
        JSON = 'json', 'JSON'

    class ProcessingMode(models.TextChoices):
        INSTANT = 'instant', 'Instant (File Sense)'
        BATCH = 'batch', 'Batch (Scheduled)'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    message_types = models.JSONField(
        default=list,
        help_text='List of MT/MX types to process, e.g. ["MT103","pacs.008"] or ["ALL"]',
    )
    output_format = models.CharField(
        max_length=5,
        choices=OutputFormat.choices,
        default=OutputFormat.XLSX,
    )
    processing_mode = models.CharField(
        max_length=10,
        choices=ProcessingMode.choices,
        default=ProcessingMode.INSTANT,
    )
    file_pattern = models.CharField(
        max_length=100, default='*.*',
        help_text='Glob pattern for sft_inbound file matching, e.g. *.fin, *.xml',
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    batch_interval_minutes = models.IntegerField(
        default=30,
        help_text='Interval in minutes for batch processing (only used when processing_mode=batch)',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'SWIFT Package'
        verbose_name_plural = 'SWIFT Packages'

    def __str__(self):
        types = self.message_types if isinstance(self.message_types, list) else []
        label = ', '.join(types[:3]) if types else 'ALL'
        if len(types) > 3:
            label += f' +{len(types) - 3}'
        return f'{self.name} ({label})'

    def accepts_message_type(self, msg_type):
        """Check if this package accepts the given message type."""
        if not self.message_types or 'ALL' in self.message_types:
            return True
        return msg_type in self.message_types
