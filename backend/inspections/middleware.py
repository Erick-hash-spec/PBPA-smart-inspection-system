"""
Security middleware for logging and monitoring
"""
import logging
import json
import time
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

audit_logger = logging.getLogger('inspections.audit')
security_logger = logging.getLogger('inspections.security')


class SecurityAuditMiddleware(MiddlewareMixin):
    """Middleware to log security-related events"""
    
    def process_request(self, request):
        """Log incoming requests"""
        request._start_time = time.time()
        request._user = str(request.user) if request.user.is_authenticated else 'Anonymous'
        
        # Log authentication events
        if 'api/auth/token/' in request.path:
            if request.method == 'POST':
                security_logger.info(
                    'Authentication attempt',
                    extra={
                        'path': request.path,
                        'method': request.method,
                        'ip': self._get_client_ip(request),
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    }
                )
        
        # Log sensitive operations
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            audit_logger.info(
                f'{request.method} request',
                extra={
                    'path': request.path,
                    'method': request.method,
                    'user': request._user,
                    'ip': self._get_client_ip(request),
                }
            )
        
        return None
    
    def process_response(self, request, response):
        """Log response and audit events"""
        # Calculate request duration
        duration = None
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
        
        # Log failed authentication attempts
        if response.status_code == 401:
            security_logger.warning(
                'Unauthorized access attempt',
                extra={
                    'path': request.path,
                    'ip': self._get_client_ip(request),
                    'method': request.method,
                    'status': response.status_code,
                }
            )
        
        # Log permission denied
        if response.status_code == 403:
            security_logger.warning(
                'Permission denied',
                extra={
                    'path': request.path,
                    'user': getattr(request, '_user', 'Unknown'),
                    'ip': self._get_client_ip(request),
                    'method': request.method,
                }
            )
        
        # Log server errors
        if response.status_code >= 500:
            security_logger.error(
                'Server error',
                extra={
                    'path': request.path,
                    'status': response.status_code,
                    'duration': duration,
                }
            )
        
        return response
    
    @staticmethod
    def _get_client_ip(request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Middleware to add additional security headers"""
    
    def process_response(self, request, response):
        """Add security headers to response"""
        # These are already set in settings, but this ensures they're always present
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY' if not settings.DEBUG else 'SAMEORIGIN'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=(), payment=()'
        
        # Content Security Policy
        if not settings.DEBUG:
            csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
            response['Content-Security-Policy'] = csp
        
        # Remove server information
        response.pop('Server', None)
        response['Server'] = 'WebServer'  # Obfuscate server type
        
        return response


class RateLimitMonitorMiddleware(MiddlewareMixin):
    """Monitor for rate limit abuse patterns"""
    
    REQUEST_CACHE = {}  # In-memory cache for tracking requests
    
    def process_request(self, request):
        """Track request patterns"""
        client_ip = self._get_client_ip(request)
        
        if client_ip not in self.REQUEST_CACHE:
            self.REQUEST_CACHE[client_ip] = {'count': 0, 'timestamp': time.time()}
        
        # Reset count if more than 1 minute has passed
        if time.time() - self.REQUEST_CACHE[client_ip]['timestamp'] > 60:
            self.REQUEST_CACHE[client_ip] = {'count': 0, 'timestamp': time.time()}
        
        self.REQUEST_CACHE[client_ip]['count'] += 1
        
        # Alert on suspicious patterns
        if self.REQUEST_CACHE[client_ip]['count'] > 100:
            security_logger.warning(
                'High request rate detected',
                extra={
                    'ip': client_ip,
                    'count': self.REQUEST_CACHE[client_ip]['count'],
                    'path': request.path,
                }
            )
        
        return None
    
    @staticmethod
    def _get_client_ip(request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
