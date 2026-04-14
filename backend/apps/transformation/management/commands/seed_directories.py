"""
Seed default delivery directories and create physical dirs.
- Transformation: imatch, mpower in trfm_outbound
- SWIFT: archive structure + imatch, mpower in sft_outbound/dev|staging|live
Run during Docker startup: python manage.py seed_directories
"""
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from apps.transformation.models import (
    DirectoryRegistry, SwiftDirectoryRegistry, SWIFT_ENVIRONMENTS,
)


class Command(BaseCommand):
    help = 'Seed default directories for transformation and SWIFT pipelines'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('── Transformation Directories ──'))
        self._seed_trfm()
        self.stdout.write(self.style.MIGRATE_HEADING('── SWIFT Directories ──'))
        self._seed_swift()
        self.stdout.write(self.style.SUCCESS('Seed complete'))

    def _seed_trfm(self):
        defaults = [
            {'name': 'imatch', 'dir_type': 'delivery', 'is_default': True},
            {'name': 'mpower', 'dir_type': 'delivery', 'is_default': True},
        ]
        for d in defaults:
            obj, created = DirectoryRegistry.objects.get_or_create(
                name=d['name'], dir_type=d['dir_type'],
                defaults={'is_default': d['is_default']},
            )
            obj.create_physical_dirs()
            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: {obj.name} ({obj.dir_type})')

    def _seed_swift(self):
        outbound = settings.SFT_OUTBOUND_DIR

        # 1. Archive structure
        for subdir in ['archive/ori', 'archive/processed']:
            path = os.path.join(outbound, subdir)
            os.makedirs(path, exist_ok=True)
            self.stdout.write(f'  Dir: {subdir}/')

        # 2. Environment dirs
        for env in SWIFT_ENVIRONMENTS:
            os.makedirs(os.path.join(outbound, env), exist_ok=True)
            self.stdout.write(f'  Dir: {env}/')

        # 3. Default delivery targets
        swift_defaults = [
            {'name': 'imatch', 'is_default': True},
            {'name': 'mpower', 'is_default': True},
        ]
        for d in swift_defaults:
            obj, created = SwiftDirectoryRegistry.objects.get_or_create(
                name=d['name'],
                defaults={'is_default': d['is_default']},
            )
            obj.create_physical_dirs()
            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: {obj.name} (in all envs)')
