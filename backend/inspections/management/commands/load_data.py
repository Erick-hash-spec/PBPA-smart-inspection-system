"""
Django management command to load sample data
Run: python manage.py load_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from inspections.models import UserProfile, Tank


class Command(BaseCommand):
    help = 'Load sample data for testing'

    def handle(self, *args, **options):
        self.stdout.write("Loading sample data...")
        
        # Create or repair sample users
        self.create_demo_user(
            username='inspector1',
            email='inspector1@example.com',
            password='password123',
            first_name='John',
            last_name='Inspector',
            role='inspector',
            department='Field Operations',
        )

        self.create_demo_user(
            username='supervisor1',
            email='supervisor1@example.com',
            password='password123',
            first_name='Jane',
            last_name='Supervisor',
            role='supervisor',
            department='QA',
        )

        self.create_demo_user(
            username='admin1',
            email='admin1@example.com',
            password='password123',
            first_name='Admin',
            last_name='User',
            role='admin',
            department='Management',
        )

        # Create sample tanks
        tanks_data = [
            {
                'tank_id': 'TANK-001',
                'tank_name': 'Crude Oil Storage A',
                'product_type': 'crude_oil',
                'capacity': 10000,
                'location': 'Bay 1',
                'height': 15.5,
                'diameter': 8.2,
            },
            {
                'tank_id': 'TANK-002',
                'tank_name': 'Fuel Oil Storage B',
                'product_type': 'fuel_oil',
                'capacity': 8000,
                'location': 'Bay 2',
                'height': 14.0,
                'diameter': 7.5,
            },
            {
                'tank_id': 'TANK-003',
                'tank_name': 'Diesel Storage C',
                'product_type': 'diesel',
                'capacity': 6000,
                'location': 'Bay 3',
                'height': 12.0,
                'diameter': 6.8,
            },
        ]

        for tank_data in tanks_data:
            tank, created = Tank.objects.get_or_create(
                tank_id=tank_data['tank_id'],
                defaults=tank_data
            )
            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{action} tank: {tank_data['tank_id']}"))

        self.stdout.write(self.style.SUCCESS("Sample data loaded successfully!"))

    def create_demo_user(self, username, email, password, first_name, last_name, role, department):
        """Create or update a demo user"""
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
            },
        )
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.set_password(password)
        user.save()

        UserProfile.objects.update_or_create(
            user=user,
            defaults={'role': role, 'department': department, 'is_active': True},
        )

        action = "Created" if created else "Updated"
        status_msg = f"{action} {role} user: {username}"
        if created:
            self.stdout.write(self.style.SUCCESS(status_msg))
        else:
            self.stdout.write(self.style.WARNING(status_msg))
