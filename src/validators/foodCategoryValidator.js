// src/validators/foodCategoryValidator.js
import { body, param, query } from "express-validator";

// ==================== CREATE ====================
export const createFoodCategoryValidator = [
  // ❌ Supprimé : restaurant_id (déduit du token)
  
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

// ==================== UPDATE ====================
export const updateFoodCategoryValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid category UUID"),
  
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

// ==================== DELETE ====================
export const deleteFoodCategoryValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid category UUID"),
];

// ==================== GET BY ID ====================
export const getFoodCategoryValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid category UUID"),
];

// ==================== GET MY CATEGORIES (authenticated restaurant) ====================
export const getMyRestaurantCategoriesValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .isLength({ min: 2, max: 100 })
    .withMessage("Search must be between 2 and 100 characters"),

  query("sort")
    .optional()
    .isIn(['ordre_affichage', 'nom', 'created_at'])
    .withMessage("Sort must be one of: ordre_affichage, nom, created_at")
];

// ==================== GET BY RESTAURANT ID (admin/public) ====================
export const getRestaurantCategoriesValidator = [
  param("restaurantId")
    .isUUID()
    .withMessage("Invalid restaurant UUID"),
];

// ==================== REORDER CATEGORIES ====================
export const reorderCategoriesValidator = [
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