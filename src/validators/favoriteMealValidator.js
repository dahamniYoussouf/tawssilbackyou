import { body, param, query } from "express-validator";

// ----------------------------
// Validator for adding a favorite meal
// ----------------------------
export const addFavoriteMealValidator = [
  // ❌ remove client_id check — comes from req.user now
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
  // ❌ remove client_id check — taken from req.user
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
