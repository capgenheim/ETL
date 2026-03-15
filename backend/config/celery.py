"""
Celery configuration for ETL Platform.
Uses Redis as message broker for async file processing.
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('etl_platform')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# ── Celery Beat schedule ──────────────────────────────────────────
app.conf.beat_schedule = {
    # File Sense: scan trfm_inbound every 30 seconds for instant pickup
    'file-sense-scan-30s': {
        'task': 'transformation.file_sense_scan',
        'schedule': 30.0,
    },
    # SWIFT Sense: scan sft_inbound every 30 seconds for SWIFT messages
    'swift-file-sense-scan-30s': {
        'task': 'transformation.swift_file_sense_scan',
        'schedule': 30.0,
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
