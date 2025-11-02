import { body, param } from "express-validator";

// ----------------------------
// Validator for creating a client
// ----------------------------
export const createClientValidator = [
  body("first_name")
    .notEmpty()
    .withMessage("First name is required"),

  body("last_name")
    .notEmpty()
    .withMessage("Last name is required"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Email must be valid"),

  body("phone_number")
    .notEmpty()
    .withMessage("Phone number is required"),

  body("address")
    .optional()
    .isString()
    .withMessage("Address must be a string"),

  body("lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a valid number"),

  body("lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a valid number"),

  body("profile_image_url")
    .optional()
    .isURL()
    .withMessage("Profile image URL must be valid"),

  body("loyalty_points")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Loyalty points must be a positive integer"),

  body("is_verified")
    .optional()
    .isBoolean()
    .withMessage("is_verified must be true or false"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),

  body("status")
    .optional()
    .isIn(["active", "inactive", "banned"])
    .withMessage("Status must be one of: active, inactive, banned"),
];

// ----------------------------
// Validator for updating a client
// ----------------------------
export const updateClientValidator = [


  body("first_name")
    .optional()
    .notEmpty()
    .withMessage("First name cannot be empty"),

  body("last_name")
    .optional()
    .notEmpty()
    .withMessage("Last name cannot be empty"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Email must be valid"),

  body("phone_number")
    .optional()
    .notEmpty()
    .withMessage("Phone number cannot be empty"),

  body("address")
    .optional()
    .isString()
    .withMessage("Address must be a string"),

  body("lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a valid number"),

  body("lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a valid number"),

  body("profile_image_url")
    .optional()
    .isURL()
    .withMessage("Profile image URL must be valid"),

  body("loyalty_points")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Loyalty points must be a positive integer"),

  body("is_verified")
    .optional()
    .isBoolean()
    .withMessage("is_verified must be true or false"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),

  body("status")
    .optional()
    .isIn(["active", "inactive", "banned"])
    .withMessage("Status must be one of: active, inactive, banned"),
];

// ----------------------------
// Validator for deleting a client
// ----------------------------
export const deleteClientValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid client UUID"),
];
