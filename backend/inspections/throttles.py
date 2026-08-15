"""
Custom rate limiting throttles with enhanced security
"""
from rest_framework.throttling import SimpleRateThrottle, BaseThrottle
from rest_framework.exceptions import Throttled
import logging

logger = logging.getLogger('inspections.security')


class LoginRateThrottle(SimpleRateThrottle):
    """Rate limiter for login attempts"""
    scope = 'login'
    
    def get_cache_key(self):
        if self.request.user.is_authenticated:
            return None  # No rate limit for authenticated users
        
        return f'login_{self.request.META.get("REMOTE_ADDR")}'


class RegistrationRateThrottle(SimpleRateThrottle):
    """Rate limiter for user registration"""
    scope = 'register'
    
    def get_cache_key(self):
        return f'register_{self.request.META.get("REMOTE_ADDR")}'


class PasswordResetRateThrottle(SimpleRateThrottle):
    """Rate limiter for password reset requests"""
    scope = 'password_reset'
    
    def get_cache_key(self):
        return f'password_reset_{self.request.META.get("REMOTE_ADDR")}'


class SuspiciousActivityThrottle(SimpleRateThrottle):
    """Aggressive rate limiting for suspicious activities"""
    scope = 'suspicious'
    
    def get_cache_key(self):
        return f'suspicious_{self.request.META.get("REMOTE_ADDR")}'
    
    def throttle_success(self):
        # Log successful requests (not throttled)
        return super().throttle_success()
    
    def throttle_failure(self):
        # Log throttled requests as security events
        logger.warning(
            'Rate limit exceeded - Suspicious Activity',
            extra={
                'remote_addr': self.request.META.get('REMOTE_ADDR'),
                'path': self.request.path,
                'method': self.request.method,
            }
        )
        return super().throttle_failure()


class IPAddressThrottle(BaseThrottle):
    """Simple IP-based throttle to track requests per IP"""
    
    def throttle_success(self):
        # Log IP addresses making requests
        logger.debug(
            f'Request from IP: {self.request.META.get("REMOTE_ADDR")} '
            f'to {self.request.path}'
        )
        return True
