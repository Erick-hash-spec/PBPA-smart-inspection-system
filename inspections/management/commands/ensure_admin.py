import os

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from inspections.models import UserProfile


class Command(BaseCommand):
    help = 'Create or update the admin user from environment variables.'

    def handle(self, *args, **options):
        username = os.environ.get('ADMIN_USERNAME', '').strip()
        email = os.environ.get('ADMIN_EMAIL', '').strip()
        password = os.environ.get('ADMIN_PASSWORD', '')
        first_name = os.environ.get('ADMIN_FIRST_NAME', 'System').strip()
        last_name = os.environ.get('ADMIN_LAST_NAME', 'Admin').strip()
        department = os.environ.get('ADMIN_DEPARTMENT', 'Management').strip()

        if not username or not email or not password:
            raise CommandError(
                'ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set.'
            )

        user, created = User.objects.get_or_create(username=username)
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'role': 'admin',
                'department': department,
                'is_active': True,
            },
        )

        action = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(f'{action} admin user: {username}'))
