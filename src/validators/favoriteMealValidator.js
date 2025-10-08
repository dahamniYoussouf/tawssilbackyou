import { body, param, query } from "express-validator";

// ----------------------------
// Validator for adding a favorite restaurant
// ----------------------------
export const addFavoriteMealValidator = [
  body("client_id")
    .notEmpty()
    .withMessage("client_id is required")
    .isUUID()
    .withMessage("client_id must be a valid UUID"),

  body("meal_id")
    .notEmpty()
    .withMessage("meal_id is required")
    .isUUID()
    .withMessage("meal_id must be a valid UUID"),

  body("customizations")
    .optional()
    .isString()
    .withMessage("customizations must be a string")
    .isLength({ max: 500 })
    .withMessage("customizations cannot exceed 500 characters"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters")
];

// ----------------------------
// Validator for removing a favorite meal
// ----------------------------
export const removeFavoriteMealValidator = [
  param("favorite_uuid")
    .notEmpty()
    .withMessage("favorite_uuid is required")
    .isUUID()
    .withMessage("favorite_uuid must be a valid UUID")
];

// ----------------------------
// Validator for getting favorite meals list
// ----------------------------
export const getFavoriteMealsValidator = [
  query("client_id")
    .notEmpty()
    .withMessage("client_id is required")
    .isUUID()
    .withMessage("client_id must be a valid UUID"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("pageSize must be between 1 and 100")
];

// ----------------------------
// Validator for updating a favorite meal
// ----------------------------
export const updateFavoriteMealValidator = [
  param("favorite_uuid")
    .notEmpty()
    .withMessage("favorite_uuid is required")
    .isUUID()
    .withMessage("favorite_uuid must be a valid UUID"),

  body("customizations")
    .optional()
    .isString()
    .withMessage("customizations must be a string")
    .isLength({ max: 500 })
    .withMessage("customizations cannot exceed 500 characters"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters")
];