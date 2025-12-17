import { body, param } from "express-validator";

export const createRecommendedDishValidator = [
  body("restaurant_id")
    .notEmpty()
    .withMessage("Restaurant ID is required")
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),

  body("menu_item_id")
    .notEmpty()
    .withMessage("Menu item ID is required")
    .isUUID()
    .withMessage("Menu item ID must be a valid UUID"),

  body("reason")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Reason must not exceed 500 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be boolean")
];

export const updateRecommendedDishValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid recommended dish UUID"),

  body("restaurant_id")
    .optional()
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),

  body("menu_item_id")
    .optional()
    .isUUID()
    .withMessage("Menu item ID must be a valid UUID"),

  body("reason")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Reason must not exceed 500 characters"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be boolean")
];

export const deleteRecommendedDishValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid recommended dish UUID")
];
