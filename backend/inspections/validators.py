"""
Input validation and sanitization utilities for security
"""
import re
import logging
from django.core.exceptions import ValidationError
from django.utils.html import escape
from bleach import clean as bleach_clean

logger = logging.getLogger('inspections.security')


def sanitize_input(value, field_type='text'):
    """
    Sanitize user input to prevent XSS and injection attacks
    
    Args:
        value: The input value to sanitize
        field_type: Type of field ('text', 'email', 'url', 'number', 'phone')
    
    Returns:
        Sanitized value
    """
    if not value:
        return value
    
    if isinstance(value, str):
        # Strip whitespace
        value = value.strip()
        
        # Escape HTML entities
        value = escape(value)
        
        if field_type == 'text':
            # Allow basic text but remove script tags and dangerous attributes
            allowed_tags = []
            value = bleach_clean(value, tags=allowed_tags, strip=True)
        
        elif field_type == 'email':
            # Ensure basic email format
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, value):
                raise ValidationError('Invalid email format')
        
        elif field_type == 'phone':
            # Only allow digits, spaces, hyphens, and plus sign
            if not re.match(r'^[\d\s\-+()]+$', value):
                raise ValidationError('Invalid phone format')
        
        elif field_type == 'url':
            # Validate URL format
            url_regex = r'^https?://[^\s/$.?#].[^\s]*$'
            if not re.match(url_regex, value):
                raise ValidationError('Invalid URL format')
    
    return value


def validate_file_upload(file_obj, allowed_extensions, max_size_mb=2.5):
    """
    Validate uploaded files for security
    
    Args:
        file_obj: The uploaded file
        allowed_extensions: List of allowed file extensions (e.g., ['pdf', 'xlsx'])
        max_size_mb: Maximum file size in MB
    
    Returns:
        None if valid, raises ValidationError otherwise
    """
    if not file_obj:
        return
    
    # Check file size
    max_size_bytes = max_size_mb * 1024 * 1024
    if file_obj.size > max_size_bytes:
        raise ValidationError(f'File size must not exceed {max_size_mb}MB')
    
    # Check file extension
    if hasattr(file_obj, 'name'):
        filename = file_obj.name
        extension = filename.split('.')[-1].lower()
        if extension not in allowed_extensions:
            raise ValidationError(f'Invalid file type. Allowed types: {", ".join(allowed_extensions)}')
    
    # Check file signature (magic bytes) for common formats
    file_obj.seek(0)
    header = file_obj.read(512)
    file_obj.seek(0)
    
    # PDF: %PDF
    if extension == 'pdf' and not header.startswith(b'%PDF'):
        raise ValidationError('Invalid PDF file')
    
    # ZIP-based formats (XLSX, DOCX): PK\x03\x04
    if extension in ['xlsx', 'docx'] and not header.startswith(b'PK\x03\x04'):
        raise ValidationError(f'Invalid {extension.upper()} file')
    
    logger.info(f'File validation passed: {filename}')


def validate_tank_data(data):
    """
    Validate tank inspection data for integrity
    
    Args:
        data: Dictionary containing tank data
    
    Returns:
        None if valid, raises ValidationError otherwise
    """
    errors = {}
    
    # Validate numeric ranges
    if 'dip_reading' in data:
        try:
            dip = float(data['dip_reading'])
            if dip < 0 or dip > 100:
                errors['dip_reading'] = 'Dip reading must be between 0 and 100 meters'
        except (ValueError, TypeError):
            errors['dip_reading'] = 'Dip reading must be a number'
    
    # Validate temperature
    if 'temperature' in data:
        try:
            temp = float(data['temperature'])
            if temp < -50 or temp > 150:
                errors['temperature'] = 'Temperature must be between -50 and 150°C'
        except (ValueError, TypeError):
            errors['temperature'] = 'Temperature must be a number'
    
    # Validate water level
    if 'water_level' in data:
        try:
            water = float(data['water_level'])
            if water < 0:
                errors['water_level'] = 'Water level cannot be negative'
        except (ValueError, TypeError):
            errors['water_level'] = 'Water level must be a number'
    
    if errors:
        raise ValidationError(errors)


def validate_sql_injection_attempt(value, field_name='field'):
    """
    Detect potential SQL injection attempts
    
    Args:
        value: The value to check
        field_name: Name of the field for logging
    
    Returns:
        None if safe, logs warning if suspicious
    """
    if not isinstance(value, str):
        return
    
    # SQL keywords that might indicate injection attempts
    sql_keywords = [
        'UNION', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP',
        'CREATE', 'ALTER', 'EXEC', 'EXECUTE', 'SCRIPT',
        'JAVASCRIPT', 'ONLOAD', 'ONCLICK'
    ]
    
    upper_value = value.upper()
    for keyword in sql_keywords:
        if keyword in upper_value:
            logger.warning(
                f'Potential SQL injection attempt detected in {field_name}',
                extra={'value': value, 'keyword': keyword}
            )
            raise ValidationError(f'Invalid input in {field_name}')
