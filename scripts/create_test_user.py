#!/usr/bin/env python
"""
Quick script to create a test user for MFA testing.

Usage:
    python backend/scripts/create_test_user.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from inspections.models import UserProfile


def create_test_user():
    """Create a test user for MFA testing."""
    
    username = 'testuser'
    email = 'testuser@example.com'
    password = 'testpass123'
    
    # Check if user exists
    if User.objects.filter(username=username).exists():
        print(f"❌ User '{username}' already exists.")
        user = User.objects.get(username=username)
        print(f"   Email: {user.email}")
        profile = UserProfile.objects.get(user=user)
        print(f"   Role: {profile.get_role_display()}")
        print(f"   MFA Enabled: {profile.mfa_enabled}")
        return
    
    # Create user
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name='Test',
        last_name='User',
    )
    
    # Create profile
    profile = UserProfile.objects.get_or_create(user=user)[0]
    profile.role = 'inspector'
    profile.save()
    
    print("✅ Test user created successfully!")
    print(f"   Username: {username}")
    print(f"   Email: {email}")
    print(f"   Password: {password}")
    print(f"   Role: {profile.get_role_display()}")
    print()
    print("📱 Next steps:")
    print("   1. Open http://127.0.0.1:3000/")
    print("   2. Log in with the credentials above")
    print("   3. Go to Settings → Security → MFA")
    print("   4. Click 'Set Up MFA' and scan the QR code")


if __name__ == '__main__':
    create_test_user()
