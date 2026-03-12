"""
Management command to auto-configure the Celery Beat periodic schedule.
Ensures file_sense_scan runs every 30 seconds to pick up inbound files.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Set up Celery Beat periodic tasks (file_sense_scan)'

    def handle(self, *args, **options):
        from django_celery_beat.models import PeriodicTask, IntervalSchedule

        # Create 30-second interval
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=30,
            period=IntervalSchedule.SECONDS,
        )

        # Create or update file_sense_scan task
        task, created = PeriodicTask.objects.get_or_create(
            name='File Sense — Scan Inbound Directory',
            defaults={
                'task': 'transformation.file_sense_scan',
                'interval': schedule,
                'enabled': True,
            },
        )

        if not created:
            # Ensure it's enabled and on correct schedule
            task.task = 'transformation.file_sense_scan'
            task.interval = schedule
            task.enabled = True
            task.save()
            self.stdout.write(self.style.WARNING(
                f'Updated: {task.name} (every {schedule.every}s)'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Created: {task.name} (every {schedule.every}s)'
            ))
