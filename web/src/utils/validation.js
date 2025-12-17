/**
 * Validation utilities for authentication
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateEmail(email) {
  if (!email || email.trim() === "") {
    return { valid: false, error: "Email is required" };
  }

  // Email regex pattern: example@example.example
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Please enter a valid email address (example@example.com)" };
  }

  // Check for valid domain structure (at least one dot after @)
  const parts = email.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  const domain = parts[1];
  if (!domain.includes(".")) {
    return { valid: false, error: "Email must include a domain (example@example.com)" };
  }

  const domainParts = domain.split(".");
  if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
    return { valid: false, error: "Email must have a valid domain extension" };
  }

  return { valid: true, error: "" };
}

/**
 * Validates password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - Only alphanumeric and basic special characters (!@#$%^&*)
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validatePassword(password) {
  if (!password || password.trim() === "") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  // Check for invalid characters (only allow alphanumeric and !@#$%^&*)
  const allowedChars = /^[a-zA-Z0-9!@#$%^&*]+$/;
  if (!allowedChars.test(password)) {
    return { 
      valid: false, 
      error: "Password can only contain letters, numbers, and these symbols: !@#$%^&*" 
    };
  }

  return { valid: true, error: "" };
}

