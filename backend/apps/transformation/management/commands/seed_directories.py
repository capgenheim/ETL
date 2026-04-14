"""
Seed default delivery directories (imatch, mpower) and create physical dirs.
Run during Docker startup: python manage.py seed_directories
"""
from django.core.management.base import BaseCommand
from apps.transformation.models import DirectoryRegistry


class Command(BaseCommand):
    help = 'Seed default delivery directories (imatch, mpower)'

    def handle(self, *args, **options):
        defaults = [
            {'name': 'imatch', 'dir_type': 'delivery', 'is_default': True},
            {'name': 'mpower', 'dir_type': 'delivery', 'is_default': True},
        ]

        created_count = 0
        for d in defaults:
            obj, created = DirectoryRegistry.objects.get_or_create(
                name=d['name'],
                dir_type=d['dir_type'],
                defaults={'is_default': d['is_default']},
            )
            obj.create_physical_dirs()
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {obj.name} ({obj.dir_type})'))
            else:
                self.stdout.write(f'  Exists:  {obj.name} ({obj.dir_type})')

        self.stdout.write(self.style.SUCCESS(f'Seed complete — {created_count} new directories'))
