"""
Sample data for testing
Run: python manage.py shell < load_sample_data.py
"""

from django.contrib.auth.models import User
from inspections.models import UserProfile, Tank


def ensure_demo_user(username, email, password, first_name, last_name, role, department):
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
    print(f"{action} {role} user: {username}")
    return user


# Create or repair sample users so the demo buttons always match real accounts.
ensure_demo_user(
    username='inspector1',
    email='inspector1@example.com',
    password='password123',
    first_name='John',
    last_name='Inspector',
    role='inspector',
    department='Field Operations',
)

ensure_demo_user(
    username='terminal_rep1',
    email='terminalrep1@example.com',
    password='password123',
    first_name='Jane',
    last_name='Terminal',
    role='terminal_representative',
    department='QA',
)

ensure_demo_user(
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
    if created:
        print(f"Created tank {tank.tank_name}")
    else:
        print(f"Tank {tank.tank_name} already exists")

print("\nSample data loading complete!")
