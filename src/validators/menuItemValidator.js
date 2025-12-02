// src/validators/menuItemValidator.js
import { body, param, query } from "express-validator";

// 🆕 CREATE MENU ITEM VALIDATOR
export const createMenuItemValidator = [
  // ❌ Supprimé : restaurant_id (déduit du token)

  body("category_id")
    .notEmpty().withMessage("category_id is required")
    .isUUID().withMessage("category_id must be a valid UUID"),

  body("nom")
    .notEmpty().withMessage("nom is required")
    .isString().withMessage("nom must be a string")
    .isLength({ min: 2, max: 255 }).withMessage("nom must be between 2 and 255 characters"),

  body("description")
    .optional()
    .isString().withMessage("description must be a string")
    .isLength({ max: 1000 }).withMessage("description must be less than 1000 characters"),

  body("prix")
    .notEmpty().withMessage("prix is required")
    .isFloat({ min: 0 }).withMessage("prix must be a positive number"),

  body("photo_url")
    .optional()
    .isString().withMessage("photo_url must be a string")
    .isURL().withMessage("photo_url must be a valid URL"),

  body("temps_preparation")
    .optional()
    .isInt({ min: 1, max: 300 }).withMessage("temps_preparation must be between 1 and 300 minutes"),

  body("is_available")
    .optional()
    .isBoolean().withMessage("is_available must be true or false")
];

// ✏️ UPDATE MENU ITEM VALIDATOR
export const updateMenuItemValidator = [
  param("id")
    .notEmpty().withMessage("Menu item ID is required")
    .isUUID().withMessage("Menu item ID must be a valid UUID"),

  body("category_id")
    .optional()
    .isUUID().withMessage("category_id must be a valid UUID"),

  body("nom")
    .optional()
    .isString().withMessage("nom must be a string")
    .isLength({ min: 2, max: 255 }).withMessage("nom must be between 2 and 255 characters"),

  body("description")
    .optional()
    .isString().withMessage("description must be a string")
    .isLength({ max: 1000 }).withMessage("description must be less than 1000 characters"),

  body("prix")
    .optional()
    .isFloat({ min: 0 }).withMessage("prix must be a positive number"),

  body("photo_url")
    .optional()
    .isString().withMessage("photo_url must be a string")
    .isURL().withMessage("photo_url must be a valid URL"),

  body("temps_preparation")
    .optional()
    .isInt({ min: 1, max: 300 }).withMessage("temps_preparation must be between 1 and 300 minutes"),

  body("is_available")
    .optional()
    .isBoolean().withMessage("is_available must be true or false")
];

// 🔍 GET MENU ITEM BY ID VALIDATOR
export const getMenuItemByIdValidator = [
  param("id")
    .notEmpty().withMessage("Menu item ID is required")
    .isUUID().withMessage("Menu item ID must be a valid UUID")
];

// 📋 GET MY MENU ITEMS VALIDATOR (authenticated restaurant)
export const getMyMenuItemsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),

  query("category_id")
    .optional()
    .isUUID().withMessage("category_id must be a valid UUID"),

  query("is_available")
    .optional()
    .isBoolean().withMessage("is_available must be true or false"),

  query("search")
    .optional()
    .isString().withMessage("search must be a string")
    .isLength({ min: 2, max: 100 }).withMessage("search must be between 2 and 100 characters"),

  query("sort")
    .optional()
    .isIn(['nom', 'prix', 'created_at'])
    .withMessage("sort must be one of: nom, prix, created_at")
];

// 📋 GET ALL MENU ITEMS VALIDATOR (admin)
export const getAllMenuItemsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),

  query("category_id")
    .optional()
    .isUUID().withMessage("category_id must be a valid UUID"),

  query("is_available")
    .optional()
    .isBoolean().withMessage("is_available must be true or false"),

  query("search")
    .optional()
    .isString().withMessage("search must be a string")
    .isLength({ min: 2, max: 100 }).withMessage("search must be between 2 and 100 characters")
];

// 🔍 GET BY CATEGORY VALIDATOR (client)
export const getByCategoryValidator = [
  body("client_id")
    .optional()
    .isUUID().withMessage("client_id must be a valid UUID"),

  body("category_id")
    .optional()
    .isUUID().withMessage("category_id must be a valid UUID"),

  body("is_available")
    .optional()
    .isBoolean().withMessage("is_available must be true or false")
];

// ❌ DELETE MENU ITEM VALIDATOR
export const deleteMenuItemValidator = [
  param("id")
    .notEmpty().withMessage("Menu item ID is required")
    .isUUID().withMessage("Menu item ID must be a valid UUID")
];

// 🔄 TOGGLE AVAILABILITY VALIDATOR
export const toggleAvailabilityValidator = [
  param("id")
    .notEmpty().withMessage("Menu item ID is required")
    .isUUID().withMessage("Menu item ID must be a valid UUID")
];

// 📦 BULK UPDATE AVAILABILITY VALIDATOR
export const bulkUpdateAvailabilityValidator = [
  body("menu_item_ids")
    .isArray({ min: 1 }).withMessage("menu_item_ids must be a non-empty array")
    .custom((value) => {
      if (!value.every(id => typeof id === 'string')) {
        throw new Error("All menu_item_ids must be valid UUIDs");
      }
      return true;
    }),

  body("is_available")
    .notEmpty().withMessage("is_available is required")
    .isBoolean().withMessage("is_available must be true or false")
];