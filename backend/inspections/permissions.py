"""
Custom permissions for the inspection system
"""
from rest_framework.permissions import BasePermission


def _role(user):
    """Return the role string for a user, or None."""
    if not user or not user.is_authenticated:
        return None
    profile = getattr(user, 'profile', None)
    return getattr(profile, 'role', None)


class IsInspector(BasePermission):
    def has_permission(self, request, view):
        return _role(request.user) == 'inspector'


class IsSupervisor(BasePermission):
    def has_permission(self, request, view):
        return _role(request.user) == 'supervisor'


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _role(request.user) == 'admin'


class IsSupervisorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return _role(request.user) in ('supervisor', 'admin')


class IsInspectorOrReadOnly(BasePermission):
    """Allow inspectors to create/edit, others can read"""

    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return request.user and request.user.is_authenticated
        return _role(request.user) == 'inspector'


class IsOwnerOrAdmin(BasePermission):
    """Require authentication at view level; ownership check at object level."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if _role(request.user) == 'admin':
            return True
        owner_field = next(
            (f for f in ('inspector', 'created_by', 'submitted_by') if hasattr(obj, f)),
            None,
        )
        return owner_field and getattr(obj, owner_field) == request.user
