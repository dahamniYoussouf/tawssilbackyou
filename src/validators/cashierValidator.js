import { body, param } from "express-validator";

export const CASHIER_STATUS_VALUES = ["active", "on_break", "offline", "suspended"];

const parseJsonObject = (value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new Error("Invalid JSON format");
    }
  }
  return value;
};

export const registerCashierValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("first_name")
    .trim()
    .notEmpty()
    .withMessage("First name is required"),

  body("last_name")
    .trim()
    .notEmpty()
    .withMessage("Last name is required"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required"),

  body("restaurant_id")
    .notEmpty()
    .withMessage("Restaurant ID is required")
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),

  body("profile_image_url")
    .optional()
    .trim()
    .isURL()
    .withMessage("Profile image must be a valid URL"),

  body("status")
    .optional()
    .isIn(CASHIER_STATUS_VALUES)
    .withMessage(`Status must be one of: ${CASHIER_STATUS_VALUES.join(", ")}`),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean")
    .toBoolean(),

  body("permissions")
    .optional()
    .customSanitizer(parseJsonObject)
    .custom((value) => {
      if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Permissions must be an object");
      }
      return true;
    }),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must not exceed 1000 characters")
];

export const updateCashierValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid cashier ID"),

  body("first_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty"),

  body("last_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty"),

  body("phone")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Phone cannot be empty"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email must be valid")
    .normalizeEmail(),

  body("profile_image_url")
    .optional()
    .trim()
    .isURL()
    .withMessage("Profile image must be a valid URL"),

  body("status")
    .optional()
    .isIn(CASHIER_STATUS_VALUES)
    .withMessage(`Status must be one of: ${CASHIER_STATUS_VALUES.join(", ")}`),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean")
    .toBoolean(),

  body("permissions")
    .optional()
    .customSanitizer(parseJsonObject)
    .custom((value) => {
      if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Permissions must be an object");
      }
      return true;
    }),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must not exceed 1000 characters")
];

export const cashierStatusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["active", "on_break", "offline"])
    .withMessage("Status must be active, on_break, or offline")
];
