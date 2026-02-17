/**
 * Validation Utilities
 * Provides validation functions with Hebrew error messages
 */

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      error: 'אנא הזן כתובת אימייל',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return {
      isValid: false,
      error: 'כתובת האימייל אינה תקינה',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates password - only requires minimum 6 characters
 * @param {string} password - Password to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export const validatePassword = (password) => {
  if (!password) {
    return {
      isValid: false,
      error: 'אנא הזן סיסמה',
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: 'הסיסמה חייבת להכיל לפחות 6 תווים',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {{isValid: boolean, error: string|null}}
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: 'אנא אמת את הסיסמה',
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'הסיסמאות אינן תואמות',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates name (first or last)
 * @param {string} name - Name to validate
 * @param {string} fieldName - Display name for the field
 * @returns {{isValid: boolean, error: string|null}}
 */
export const validateName = (name, fieldName = 'שם') => {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      error: `אנא הזן ${fieldName}`,
    };
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: `${fieldName} חייב להכיל לפחות 2 תווים`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates Israeli phone number
 * @param {string} phone - Phone number to validate
 * @returns {{isValid: boolean, error: string|null}}
 */
export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      error: 'אנא הזן מספר טלפון',
    };
  }

  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s-]/g, '');

  // Israeli phone: 10 digits starting with 0, or 9 digits without 0
  const phoneRegex = /^0?(5[0-9]|[2-4]|[8-9])[0-9]{7}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return {
      isValid: false,
      error: 'מספר הטלפון אינו תקין',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates all registration fields
 * @param {Object} fields - Object containing all registration fields
 * @returns {{isValid: boolean, errors: Object}}
 */
export const validateRegistrationFields = (fields) => {
  const errors = {};
  let isValid = true;

  // Validate first name
  const firstNameValidation = validateName(fields.firstName, 'שם פרטי');
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation.error;
    isValid = false;
  }

  // Validate last name
  const lastNameValidation = validateName(fields.lastName, 'שם משפחה');
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.error;
    isValid = false;
  }

  // Validate email
  const emailValidation = validateEmail(fields.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
    isValid = false;
  }

  // Validate phone
  const phoneValidation = validatePhone(fields.phone);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error;
    isValid = false;
  }

  // Validate password
  const passwordValidation = validatePassword(fields.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
    isValid = false;
  }

  // Validate password confirmation if provided
  if (fields.confirmPassword !== undefined) {
    const confirmValidation = validatePasswordMatch(
      fields.password,
      fields.confirmPassword
    );
    if (!confirmValidation.isValid) {
      errors.confirmPassword = confirmValidation.error;
      isValid = false;
    }
  }

  return { isValid, errors };
};
