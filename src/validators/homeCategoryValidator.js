import { body, param } from "express-validator";

const slugPattern = /^[a-z0-9_-]+$/;

export const createHomeCategoryValidator = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters"),

  body("slug")
    .optional()
    .matches(slugPattern)
    .withMessage("Slug must contain only lowercase letters, numbers, hyphens or underscores"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("image_url")
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Image URL must be valid"),

  body("display_order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a positive integer"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean value"),
];

export const updateHomeCategoryValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid category UUID"),

  body("name")
    .optional()
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters"),

  body("slug")
    .optional()
    .matches(slugPattern)
    .withMessage("Slug must contain only lowercase letters, numbers, hyphens or underscores"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("image_url")
    .optional()
    .isURL()
    .withMessage("Image URL must be valid"),

  body("display_order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a positive integer"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean value"),
];

export const deleteHomeCategoryValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid category UUID"),
];
