from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    Immutable audit trail for financial-grade compliance.
    Records every significant action across API and Django admin.
    """

    class Category(models.TextChoices):
        AUTH = 'AUTH', 'Authentication'
        TRANSFORMATION = 'TRANSFORMATION', 'Transformation'
        FILE_MANAGER = 'FILE_MANAGER', 'File Manager'
        ADMIN = 'ADMIN', 'Admin Panel'
        SYSTEM = 'SYSTEM', 'System'

    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'

    # Who
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs',
    )
    user_email = models.CharField(max_length=255, blank=True, default='')

    # What
    action = models.CharField(max_length=100, db_index=True)
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.SYSTEM,
        db_index=True,
    )
    resource_type = models.CharField(max_length=100, blank=True, default='')
    resource_id = models.CharField(max_length=100, blank=True, default='')
    detail = models.TextField(blank=True, default='')
    changes_json = models.JSONField(null=True, blank=True, help_text='Before/after field changes')

    # Where (network)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')

    # Where (geolocation)
    geo_lat = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True,
        help_text='Latitude from browser geolocation',
    )
    geo_lng = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True,
        help_text='Longitude from browser geolocation',
    )

    # Request context
    request_method = models.CharField(max_length=10, blank=True, default='')
    request_path = models.CharField(max_length=500, blank=True, default='')
    session_id = models.CharField(max_length=100, blank=True, default='')

    # Result
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.SUCCESS,
        db_index=True,
    )

    # When
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp', 'category']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M:%S}] {self.action} — {self.user_email or 'system'}"

    @classmethod
    def log(cls, action, category='SYSTEM', user=None, **kwargs):
        """Helper to create an audit entry."""
        return cls.objects.create(
            action=action,
            category=category,
            user=user,
            user_email=getattr(user, 'email', '') if user else kwargs.get('user_email', ''),
            **kwargs,
        )
