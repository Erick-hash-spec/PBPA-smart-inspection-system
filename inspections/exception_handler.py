"""
Custom exception handler for REST API to handle errors securely
"""
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from django.conf import settings

logger = logging.getLogger('inspections.security')


def custom_exception_handler(exc, context):
    """
    Custom exception handler that:
    1. Logs all exceptions for security auditing
    2. Hides sensitive information in production
    3. Returns consistent error responses
    """
    # Get the standard exception response
    response = exception_handler(exc, context)
    
    # Log the exception
    logger.warning(
        'API Exception',
        extra={
            'exception': str(exc),
            'exception_type': exc.__class__.__name__,
            'path': context.get('request').path if context.get('request') else None,
            'method': context.get('request').method if context.get('request') else None,
            'user': str(context.get('request').user) if context.get('request') else None,
        }
    )
    
    if response is not None:
        # In production, sanitize error messages to avoid information disclosure
        if not settings.DEBUG:
            # Check for database errors or other sensitive information
            if response.status_code >= 500:
                response.data = {
                    'error': 'An internal server error occurred',
                    'status_code': response.status_code,
                }
            elif response.status_code == 404:
                response.data = {
                    'error': 'Resource not found',
                    'status_code': response.status_code,
                }
            elif response.status_code == 403:
                response.data = {
                    'error': 'Permission denied',
                    'status_code': response.status_code,
                }
            elif response.status_code == 401:
                response.data = {
                    'error': 'Authentication required',
                    'status_code': response.status_code,
                }
    else:
        # Handle unexpected exceptions
        logger.error(
            'Unhandled Exception',
            extra={'exception': str(exc)},
            exc_info=True
        )
        
        if not settings.DEBUG:
            response = Response(
                {'error': 'An internal server error occurred'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        else:
            response = Response(
                {'error': str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return response
