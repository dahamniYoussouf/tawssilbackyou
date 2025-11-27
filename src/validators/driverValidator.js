// src/validators/driverValidator.js
import { body, param , query} from "express-validator";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";

export const createDriverValidator = [
  body("first_name")
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("First name must be between 2 and 100 characters"),

  body("last_name")
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Last name must be between 2 and 100 characters"),

  body("phone")
    .notEmpty()
    .withMessage("Phone is required")
    .customSanitizer((value) => normalizePhoneNumber(value))
    .matches(/^213\d{9,}$/)
    .withMessage("Invalid phone number format (must start with 213)"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Email must be valid"),

  body("vehicle_type")
    .notEmpty()
    .withMessage("Vehicle type is required")
    .isIn(['motorcycle', 'car', 'bicycle', 'scooter'])
    .withMessage("Vehicle type must be one of: motorcycle, car, bicycle, scooter"),

  body("vehicle_plate")
    .optional()
    .isString()
    .withMessage("Vehicle plate must be a string"),

  body("license_number")
    .optional()
    .isString()
    .withMessage("License number must be a string")
];

export const updateDriverValidator = [
  body("first_name")
    .optional()
    .notEmpty()
    .withMessage("First name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("First name must be between 2 and 100 characters"),

  body("last_name")
    .optional()
    .notEmpty()
    .withMessage("Last name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Last name must be between 2 and 100 characters"),

  body("phone")
    .optional()
    .customSanitizer((value) => value ? normalizePhoneNumber(value) : value)
    .matches(/^213\d{9,}$/)
    .withMessage("Invalid phone number format (must start with 213)"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Email must be valid"),

  body("vehicle_type")
    .optional()
    .isIn(['motorcycle', 'car', 'bicycle', 'scooter'])
    .withMessage("Vehicle type must be one of: motorcycle, car, bicycle, scooter"),

  body("vehicle_plate")
    .optional()
    .isString()
    .withMessage("Vehicle plate must be a string"),

  body("license_number")
    .optional()
    .isString()
    .withMessage("License number must be a string"),

  body("is_verified")
    .optional()
    .isBoolean()
    .withMessage("is_verified must be true or false"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false")
];

export const deleteDriverValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid driver UUID")
];

export const updateStatusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(['available', 'busy', 'offline', 'suspended'])
    .withMessage("Status must be one of: available, busy, offline, suspended")
];


// ===== GET DRIVER BY ID =====
export const getDriverByIdValidator = [
  param("id")
    .notEmpty()
    .withMessage("Driver ID is required")
    .isUUID()
    .withMessage("Invalid driver UUID")
];

// ===== GET ALL DRIVERS (with filters and pagination) =====
export const getAllDriversValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("PageSize must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(['available', 'busy', 'offline', 'suspended'])
    .withMessage("Status must be one of: available, busy, offline, suspended"),

  query("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),

  query("is_verified")
    .optional()
    .isBoolean()
    .withMessage("is_verified must be true or false"),

  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .isLength({ min: 2, max: 100 })
    .withMessage("Search must be between 2 and 100 characters")
];