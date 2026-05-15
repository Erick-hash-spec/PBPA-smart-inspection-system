"""
Custom permissions for the inspection system
"""
from rest_framework.permissions import BasePermission


class IsInspector(BasePermission):
    """Permission to check if user is an inspector"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'profile') and request.user.profile.role == 'inspector'


class IsSupervisor(BasePermission):
    """Permission to check if user is a supervisor"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'profile') and request.user.profile.role == 'supervisor'


class IsAdmin(BasePermission):
    """Permission to check if user is an admin"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'profile') and request.user.profile.role == 'admin'


class IsInspectorOrReadOnly(BasePermission):
    """Allow inspectors to create/edit, others can read"""
    
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return (
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'inspector'
        )


class IsOwnerOrAdmin(BasePermission):
    """Permission to check if user is the owner or admin"""
    
    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'profile') and request.user.profile.role == 'admin':
            return True
        
        if hasattr(obj, 'inspector'):
            return obj.inspector == request.user
        
        return False
