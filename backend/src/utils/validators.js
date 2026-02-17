import Joi from 'joi';
import { ValidationError } from './errors.js';

// Email validation
export const validateEmail = (email) => {
  const schema = Joi.string().email().required();
  const { error } = schema.validate(email);
  if (error) {
    throw new ValidationError('Invalid email format', 'email');
  }
  return true;
};

// Israeli phone number validation (basic)
export const validatePhone = (phone) => {
  // Israeli phone: 10 digits, may start with 0 or +972
  const schema = Joi.string()
    .pattern(/^(\+972|0)?[1-9]\d{8}$/)
    .required();
  const { error } = schema.validate(phone);
  if (error) {
    throw new ValidationError('Invalid phone number format (Israeli format required)', 'phone');
  }
  return true;
};

// Password validation - only requires minimum 6 characters (no complexity requirements)
export const validatePassword = (password) => {
  const schema = Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
    });
  const { error } = schema.validate(password);
  if (error) {
    throw new ValidationError(error.details[0].message, 'password');
  }
  return true;
};

// Name validation
export const validateName = (name, fieldName = 'name') => {
  const schema = Joi.string().min(1).max(100).trim().required();
  const { error } = schema.validate(name);
  if (error) {
    throw new ValidationError(`Invalid ${fieldName}`, fieldName);
  }
  return true;
};

// Time format validation (HH:mm)
export const validateTime = (time) => {
  const schema = Joi.string()
    .pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .required();
  const { error } = schema.validate(time);
  if (error) {
    throw new ValidationError('Invalid time format (HH:mm required)', 'startTime');
  }
  return true;
};

// Positive number validation
export const validatePositiveNumber = (value, fieldName) => {
  const schema = Joi.number().positive().required();
  const { error } = schema.validate(value);
  if (error) {
    throw new ValidationError(`${fieldName} must be a positive number`, fieldName);
  }
  return true;
};

// Date validation
export const validateDate = (date, fieldName = 'date') => {
  const schema = Joi.date().iso().required();
  const { error } = schema.validate(date);
  if (error) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
  return true;
};

// Transaction type validation
export const validateTransactionType = (type) => {
  const validTypes = ['subscription', 'punch_card', 'trial_lesson'];
  if (!validTypes.includes(type)) {
    throw new ValidationError(
      `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`,
      'transactionType'
    );
  }
  return true;
};

// Event type validation
export const validateEventType = (type) => {
  const validTypes = ['trial', 'subscription_only', 'paid_workshop'];
  if (!validTypes.includes(type)) {
    throw new ValidationError(
      `Invalid event type. Must be one of: ${validTypes.join(', ')}`,
      'eventType'
    );
  }
  return true;
};

