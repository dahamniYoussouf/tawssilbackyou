import { body, param } from "express-validator";

export const createFoodCategoryValidator = [
  body("restaurant_id")
    .notEmpty()
    .withMessage("Restaurant ID is required")
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),
  body("nom")
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("icone_url")
    .optional()
    .isURL()
    .withMessage("Icon URL must be valid"),
  body("ordre_affichage")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a positive integer"),
];

export const updateFoodCategoryValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid category UUID"),
  body("restaurant_id")
    .optional()
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),
  body("nom")
    .optional()
    .notEmpty()
    .withMessage("Category name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("icone_url")
    .optional()
    .isURL()
    .withMessage("Icon URL must be valid"),
  body("ordre_affichage")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a positive integer"),
];

export const deleteFoodCategoryValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid category UUID"),
];

export const getFoodCategoryValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid category UUID"),
];

export const getRestaurantCategoriesValidator = [
  param("restaurantId")
    .isUUID()
    .withMessage("Invalid restaurant UUID"),
];

export const reorderCategoriesValidator = [
  param("restaurantId")
    .isUUID()
    .withMessage("Invalid restaurant UUID"),
  body("categories")
    .isArray({ min: 1 })
    .withMessage("Categories must be a non-empty array"),
  body("categories.*.id")
    .isUUID()
    .withMessage("Each category ID must be a valid UUID"),
  body("categories.*.ordre_affichage")
    .isInt({ min: 0 })
    .withMessage("Each order must be a positive integer"),
];