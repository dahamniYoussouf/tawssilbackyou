// src/validators/driverValidator.js
import { body, param , query} from "express-validator";

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
    .matches(/^[0-9+\- ]*$/i)
    .withMessage("Invalid phone number format"),

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
    .matches(/^[0-9+\- ]*$/i)
    .withMessage("Invalid phone number format"),

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

// ===== GET ALL DRIVERS (with filters) =====
export const getAllDriversValidator = [
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