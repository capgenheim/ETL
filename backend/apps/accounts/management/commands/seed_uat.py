from django.core.management.base import BaseCommand
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Seed database with UAT test data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding UAT data...'))

        # ========================================
        # Users
        # ========================================
        users_data = [
            {
                'email': 'superadmin@etlplatform.local',
                'username': 'superadmin',
                'first_name': 'Super',
                'last_name': 'Admin',
                'password': 'SuperAdmin@123',
                'role': User.Role.SUPERADMIN,
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': 'admin@etlplatform.local',
                'username': 'admin',
                'first_name': 'System',
                'last_name': 'Administrator',
                'password': 'Admin@12345',
                'role': User.Role.SUPERADMIN,
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': 'manager@etlplatform.local',
                'username': 'manager',
                'first_name': 'Ahmad',
                'last_name': 'Razak',
                'password': 'Manager@123',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': False,
            },
            {
                'email': 'analyst@etlplatform.local',
                'username': 'analyst',
                'first_name': 'Siti',
                'last_name': 'Nurhaliza',
                'password': 'Analyst@123',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': False,
            },
            {
                'email': 'operator1@etlplatform.local',
                'username': 'operator1',
                'first_name': 'Mohd',
                'last_name': 'Faizal',
                'password': 'Operator@123',
                'role': User.Role.USER,
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'email': 'operator2@etlplatform.local',
                'username': 'operator2',
                'first_name': 'Nurul',
                'last_name': 'Aisyah',
                'password': 'Operator@123',
                'role': User.Role.USER,
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'email': 'viewer@etlplatform.local',
                'username': 'viewer',
                'first_name': 'Lee',
                'last_name': 'Wei Ming',
                'password': 'Viewer@1234',
                'role': User.Role.USER,
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'email': 'auditor@etlplatform.local',
                'username': 'auditor',
                'first_name': 'Rajesh',
                'last_name': 'Kumar',
                'password': 'Auditor@123',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': False,
            },
        ]

        created_count = 0
        skipped_count = 0

        for data in users_data:
            password = data.pop('password')
            is_staff = data.pop('is_staff')
            is_superuser = data.pop('is_superuser')

            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults=data,
            )

            if created:
                user.set_password(password)
                user.is_staff = is_staff
                user.is_superuser = is_superuser
                user.save()
                created_count += 1
                self.stdout.write(
                    f'  ✓ Created {user.get_role_display():>12} : '
                    f'{user.email} ({user.get_full_name()})'
                )
            else:
                skipped_count += 1
                self.stdout.write(
                    f'  - Skipped {user.get_role_display():>12} : '
                    f'{user.email} (already exists)'
                )

        # ========================================
        # Summary
        # ========================================
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'UAT seeding complete: {created_count} created, {skipped_count} skipped'
        ))
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('UAT Credentials Reference:'))
        self.stdout.write('  ┌─────────────────────────────────────────────────────────────┐')
        self.stdout.write('  │ Role          │ Email                         │ Password     │')
        self.stdout.write('  ├───────────────┼───────────────────────────────┼──────────────┤')
        self.stdout.write('  │ Super Admin   │ superadmin@etlplatform.local  │ SuperAdmin@123│')
        self.stdout.write('  │ Super Admin   │ admin@etlplatform.local       │ Admin@12345  │')
        self.stdout.write('  │ Admin         │ manager@etlplatform.local     │ Manager@123  │')
        self.stdout.write('  │ Admin         │ analyst@etlplatform.local     │ Analyst@123  │')
        self.stdout.write('  │ Admin         │ auditor@etlplatform.local     │ Auditor@123  │')
        self.stdout.write('  │ User          │ operator1@etlplatform.local   │ Operator@123 │')
        self.stdout.write('  │ User          │ operator2@etlplatform.local   │ Operator@123 │')
        self.stdout.write('  │ User          │ viewer@etlplatform.local      │ Viewer@1234  │')
        self.stdout.write('  └─────────────────────────────────────────────────────────────┘')
