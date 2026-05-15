/**
 * Security utilities for the frontend application
 * Provides input sanitization, CSRF protection, and secure storage
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - The input to sanitize
 * @param {string} type - The type of input (text, html, email, url)
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input, type = 'text') => {
  if (!input || typeof input !== 'string') return '';
  
  const div = document.createElement('div');
  
  if (type === 'text') {
    // Escape HTML entities for plain text
    div.textContent = input;
    return div.innerHTML;
  }
  
  if (type === 'email') {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input) ? input : '';
  }
  
  if (type === 'url') {
    // Validate URL and ensure it's HTTPS
    try {
      const url = new URL(input);
      if (!url.protocol.startsWith('https')) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  }
  
  // Default: escape HTML
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Validate form data before submission
 * @param {object} data - The form data to validate
 * @param {object} rules - Validation rules
 * @returns {object} Validation errors, if any
 */
export const validateFormData = (data, rules) => {
  const errors = {};
  
  Object.entries(rules).forEach(([field, rule]) => {
    const value = data[field];
    
    if (rule.required && !value) {
      errors[field] = `${field} is required`;
      return;
    }
    
    if (rule.minLength && value?.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
    }
    
    if (rule.maxLength && value?.length > rule.maxLength) {
      errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
    }
    
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.patternMessage || `${field} format is invalid`;
    }
    
    if (rule.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors[field] = 'Invalid email address';
      }
    }
  });
  
  return errors;
};

/**
 * Securely store sensitive data
 * Use sessionStorage for tokens (cleared on tab close)
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @param {string} storage - 'session' or 'local' (default: session)
 */
export const secureStore = (key, value, storage = 'session') => {
  if (!key || !value) return;
  
  try {
    const storageObj = storage === 'session' ? sessionStorage : localStorage;
    storageObj.setItem(key, value);
  } catch (e) {
    console.error('Failed to store secure data:', e);
  }
};

/**
 * Securely retrieve stored data
 * @param {string} key - Storage key
 * @param {string} storage - 'session' or 'local' (default: session)
 * @returns {string|null} Stored value or null
 */
export const secureRetrieve = (key, storage = 'session') => {
  try {
    const storageObj = storage === 'session' ? sessionStorage : localStorage;
    return storageObj.getItem(key);
  } catch (e) {
    console.error('Failed to retrieve secure data:', e);
    return null;
  }
};

/**
 * Securely clear all stored data
 * @param {string} storage - 'session', 'local', or 'all' (default: all)
 */
export const secureClear = (storage = 'all') => {
  try {
    if (storage === 'session' || storage === 'all') {
      sessionStorage.clear();
    }
    if (storage === 'local' || storage === 'all') {
      localStorage.clear();
    }
  } catch (e) {
    console.error('Failed to clear secure storage:', e);
  }
};

/**
 * Detect potential XSS attempts in user input
 * @param {string} input - Input to check
 * @returns {boolean} True if suspicious patterns detected
 */
export const detectXSSAttempt = (input) => {
  if (!input || typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /eval\(/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Log security events
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const logSecurityEvent = (event, data = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...data,
  };
  
  // Only log in development or if explicitly enabled
  if (process.env.REACT_APP_DEBUG_SECURITY === 'true') {
    console.warn('[Security Event]', logEntry);
  }
};

/**
 * Hash a string using SHA-256 (for client-side verification)
 * Note: This is for display/verification purposes only, not cryptographic security
 * @param {string} str - String to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
export const clientSideHash = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Generate a secure random token for client-side use
 * @param {number} length - Token length (default: 32)
 * @returns {string} Random token
 */
export const generateClientToken = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
