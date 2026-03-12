import os
from django.core.management.base import BaseCommand
from oauth2_provider.models import Application
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Set up OAuth2 application and create default superuser'

    def add_arguments(self, parser):
        parser.add_argument(
            '--noinput',
            action='store_true',
            help='Run without prompting for input',
        )

    def handle(self, *args, **options):
        # Create or update OAuth2 Application
        client_id = os.environ.get('OAUTH2_CLIENT_ID', 'etl-frontend-client')
        client_secret = os.environ.get('OAUTH2_CLIENT_SECRET', 'etl-frontend-secret')

        app, created = Application.objects.update_or_create(
            client_id=client_id,
            defaults={
                'name': 'ETL Frontend',
                'client_type': Application.CLIENT_CONFIDENTIAL,
                'authorization_grant_type': Application.GRANT_PASSWORD,
                'skip_authorization': True,
            }
        )
        # Store client_secret as plain text (NOT hashed).
        # Django OAuth Toolkit auto-hashes secrets via .save(),
        # so we use .update() to bypass the hashing.
        Application.objects.filter(pk=app.pk).update(client_secret=client_secret)

        if created:
            self.stdout.write(self.style.SUCCESS(f'Created OAuth2 application: {app.name}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Updated OAuth2 application: {app.name}'))

        # Create default superuser if not exists
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@etlplatform.local')
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Admin@12345')

        if not User.objects.filter(email=email).exists():
            user = User.objects.create_superuser(
                email=email,
                username=username,
                password=password,
                first_name='System',
                last_name='Administrator',
                role=User.Role.SUPERADMIN,
            )
            self.stdout.write(self.style.SUCCESS(f'Created superuser: {user.email}'))
        else:
            self.stdout.write(self.style.WARNING(f'Superuser already exists: {email}'))
