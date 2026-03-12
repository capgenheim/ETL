"""
ETL Platform Django config package.
Loads Celery on startup so that @shared_task decorators are registered.
"""
from .celery import app as celery_app

__all__ = ('celery_app',)