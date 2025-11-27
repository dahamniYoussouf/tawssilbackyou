import { body } from 'express-validator';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';

// Request OTP validator
export const requestOTPValidator = [
  body('phone_number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .customSanitizer((value) => normalizePhoneNumber(value))
    .matches(/^213\d{9,}$/)
    .withMessage('Invalid phone number format (must start with 213)')
];

// Verify OTP validator
export const verifyOTPValidator = [
  body('phone_number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .customSanitizer((value) => normalizePhoneNumber(value))
    .matches(/^213\d{9,}$/)
    .withMessage('Invalid phone number format (must start with 213)'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  body('device_id')
    .optional()
    .trim()
    .isString()
    .withMessage('Device ID must be a string')
];

// Register validator
export const registerValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['driver', 'restaurant'])
    .withMessage('Type must be either driver or restaurant'),
  
  // ============================================
  // DRIVER-SPECIFIC VALIDATIONS
  // ============================================
  body('first_name')
    .if(body('type').equals('driver'))
    .notEmpty()
    .withMessage('First name is required for drivers')
    .trim()
    .isString()
    .withMessage('First name must be a string')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('last_name')
    .if(body('type').equals('driver'))
    .notEmpty()
    .withMessage('Last name is required for drivers')
    .trim()
    .isString()
    .withMessage('Last name must be a string')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('phone')
    .if(body('type').equals('driver'))
    .notEmpty()
    .withMessage('Phone is required for drivers')
    .trim()
    .customSanitizer((value) => normalizePhoneNumber(value))
    .matches(/^213\d{9,}$/)
    .withMessage('Invalid phone format (must start with 213)'),
  
  body('vehicle_type')
    .if(body('type').equals('driver'))
    .notEmpty()
    .withMessage('Vehicle type is required for drivers')
    .isIn(['motorcycle', 'bicycle', 'scooter'])
    .withMessage('Vehicle type must be one of: motorcycle, bicycle, scooter'),
  
  body('vehicle_plate')
    .if(body('type').equals('driver'))
    .optional()
    .trim()
    .isString()
    .withMessage('Vehicle plate must be a string'),
  
  body('license_number')
    .if(body('type').equals('driver'))
    .optional()
    .trim()
    .isString()
    .withMessage('License number must be a string'),

  // ============================================
  // RESTAURANT-SPECIFIC VALIDATIONS
  // ============================================
  body('name')
    .if(body('type').equals('restaurant'))
    .notEmpty()
    .withMessage('Restaurant name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Restaurant name must be between 2 and 100 characters'),
  
  body('lat')
    .if(body('type').equals('restaurant'))
    .notEmpty()
    .withMessage('Latitude is required for restaurants')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('lng')
    .if(body('type').equals('restaurant'))
    .notEmpty()
    .withMessage('Longitude is required for restaurants')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('categories')
    .if(body('type').equals('restaurant'))
    .notEmpty()
    .withMessage('At least one category is required')
    .isArray({ min: 1 })
    .withMessage('Categories must be an array with at least one item')
    .custom((value) => {
      const validCategories = ['pizza', 'burger', 'tacos', 'sandwish'];
      const isValid = value.every(cat => validCategories.includes(cat));
      if (!isValid) {
        throw new Error('Invalid category. Must be one of: pizza, burger, tacos, sandwish');
      }
      return true;
    }),
  
  body('address')
    .if(body('type').equals('restaurant'))
    .optional()
    .trim()
    .isString()
    .withMessage('Address must be a string'),
  
  body('description')
    .if(body('type').equals('restaurant'))
    .optional()
    .trim()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('email')
    .if(body('type').equals('restaurant'))
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email must be a valid email address'),
  
  body('rating')
    .if(body('type').equals('restaurant'))
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  
  body('is_active')
    .if(body('type').equals('restaurant'))
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
    .toBoolean(),
  
  body('is_premium')
    .if(body('type').equals('restaurant'))
    .optional()
    .isBoolean()
    .withMessage('is_premium must be a boolean')
    .toBoolean(),
  
  
  body('opening_hours')
    .if(body('type').equals('restaurant'))
    .optional()
    .isObject()
    .withMessage('Opening hours must be a JSON object'),
  
  body('device_id')
    .optional()
    .trim()
    .isString()
    .withMessage('Device ID must be a string')
];

// Login validator
export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['driver', 'restaurant', 'admin'])
    .withMessage('Type must be one of: driver, restaurant, admin'),
  body('device_id')
    .optional()
    .trim()
    .isString()
    .withMessage('Device ID must be a string')
];

// Refresh token validator
export const refreshTokenValidator = [
  body('refresh_token')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string')
];

// Logout validator
export const logoutValidator = [
  body('refresh_token')
    .optional()
    .trim()
    .isString()
    .withMessage('Refresh token must be a string')
];