"""
Sample data for testing
Run: python manage.py shell < load_sample_data.py
"""

from django.contrib.auth.models import User
from inspections.models import UserProfile, Tank

# Create sample users
if not User.objects.filter(username='inspector1').exists():
    inspector = User.objects.create_user(
        username='inspector1',
        email='inspector1@example.com',
        password='password123',
        first_name='John',
        last_name='Inspector'
    )
    UserProfile.objects.create(user=inspector, role='inspector', department='Field Operations')
    print("Created inspector user")

if not User.objects.filter(username='supervisor1').exists():
    supervisor = User.objects.create_user(
        username='supervisor1',
        email='supervisor1@example.com',
        password='password123',
        first_name='Jane',
        last_name='Supervisor'
    )
    UserProfile.objects.create(user=supervisor, role='supervisor', department='QA')
    print("Created supervisor user")

if not User.objects.filter(username='admin1').exists():
    admin = User.objects.create_user(
        username='admin1',
        email='admin1@example.com',
        password='password123',
        first_name='Admin',
        last_name='User'
    )
    UserProfile.objects.create(user=admin, role='admin', department='Management')
    print("Created admin user")

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
    if created:
        print(f"Created tank {tank.tank_name}")
    else:
        print(f"Tank {tank.tank_name} already exists")

print("\nSample data loading complete!")
