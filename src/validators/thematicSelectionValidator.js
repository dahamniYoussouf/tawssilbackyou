import { body, param } from "express-validator";

export const createThematicSelectionValidator = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 150 })
    .withMessage("Name must be between 2 and 150 characters"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("home_category_id")
    .notEmpty()
    .withMessage("Home category ID is required")
    .isUUID()
    .withMessage("Invalid home category UUID"),

  body("image_url")
    .optional()
    .isURL()
    .withMessage("Image URL must be valid"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be boolean")
];

export const updateThematicSelectionValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid selection UUID"),

  body("name")
    .optional()
    .isLength({ min: 2, max: 150 })
    .withMessage("Name must be between 2 and 150 characters"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("home_category_id")
    .optional()
    .isUUID()
    .withMessage("Invalid home category UUID"),

  body("image_url")
    .optional()
    .isURL()
    .withMessage("Image URL must be valid"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be boolean")
];

export const deleteThematicSelectionValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid selection UUID")
];
