import { MAX_EVENT_DATE_RANGE_DAYS } from '../config/constants.js';

/**
 * Generate recurring event instances for a date range
 * @param {Object} baseEvent - The base recurring event
 * @param {Date} startDate - Start date of the range
 * @param {Date} endDate - End date of the range
 * @returns {Array} Array of event instances
 */
export const generateRecurringInstances = (baseEvent, startDate, endDate) => {
  if (!baseEvent.isRecurring || !baseEvent.recurringIntervalDays) {
    return [];
  }

  const instances = [];
  const baseDate = baseEvent.date.toDate();
  const intervalDays = baseEvent.recurringIntervalDays;

  // Normalize baseDate to UTC midnight
  const baseDateUTC = new Date(baseDate);
  baseDateUTC.setUTCHours(0, 0, 0, 0);

  // Normalize startDate to UTC midnight for comparison
  const startDateUTC = new Date(startDate);
  startDateUTC.setUTCHours(0, 0, 0, 0);

  // Find the first occurrence on or after startDate
  let currentDate = new Date(baseDateUTC);
  while (currentDate < startDateUTC) {
    currentDate = new Date(currentDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + intervalDays);
    currentDate.setUTCHours(0, 0, 0, 0);
  }
  
  // Normalize endDate to UTC midnight for comparison
  const endDateUTC = new Date(endDate);
  endDateUTC.setUTCHours(23, 59, 59, 999);

  // Generate instances until endDate
  while (currentDate <= endDateUTC) {
    // Ensure the date is at UTC midnight to preserve the intended date
    const instanceDate = new Date(currentDate);
    instanceDate.setUTCHours(0, 0, 0, 0);
    
    const instance = {
      ...baseEvent,
      id: `${baseEvent.id}_${instanceDate.toISOString().split('T')[0]}`,
      date: instanceDate,
      occurrenceDate: instanceDate,
      isInstance: true,
      baseEventId: baseEvent.id,
    };
    instances.push(instance);
    
    currentDate = new Date(currentDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + intervalDays);
    currentDate.setUTCHours(0, 0, 0, 0);
  }

  return instances;
};

/**
 * Validate date range (max 1 month)
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const validateDateRange = (startDate, endDate) => {
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > MAX_EVENT_DATE_RANGE_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_EVENT_DATE_RANGE_DAYS} days`);
  }
  
  if (startDate > endDate) {
    throw new Error('Start date must be before end date');
  }
};

/**
 * Check if date is in previous month
 * @param {Date} date
 * @returns {boolean}
 */
export const isPreviousMonth = (date) => {
  const now = new Date();
  const checkDate = new Date(date);
  
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  const checkMonth = checkDate.getMonth();
  const checkYear = checkDate.getFullYear();
  
  // Check if checkDate is from previous month
  if (checkYear < nowYear) return true;
  if (checkYear === nowYear && checkMonth < nowMonth) return true;
  
  return false;
};

/**
 * Update date to current month with same day/time
 * @param {Date} originalDate
 * @returns {Date}
 */
export const updateToCurrentMonth = (originalDate) => {
  const now = new Date();
  const original = new Date(originalDate);
  
  const updated = new Date(now);
  updated.setMonth(now.getMonth());
  updated.setDate(original.getDate());
  updated.setHours(original.getHours());
  updated.setMinutes(original.getMinutes());
  updated.setSeconds(original.getSeconds());
  
  return updated;
};

/**
 * Generate password reset token
 * @returns {string}
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

