import { body, param, query } from "express-validator";

// 🆕 CREATE ORDER ITEM VALIDATOR
export const createOrderItemValidator = [
  body("order_id")
    .notEmpty().withMessage("order_id is required")
    .isUUID().withMessage("order_id must be a valid UUID"),

  body("menu_item_id")
    .notEmpty().withMessage("menu_item_id is required")
    .isUUID().withMessage("menu_item_id must be a valid UUID"),

  body("quantite")
    .optional()
    .isInt({ min: 1 }).withMessage("quantite must be at least 1"),

  body("instructions_speciales")
    .optional()
    .isString().withMessage("instructions_speciales must be a string")
    .isLength({ max: 500 }).withMessage("instructions_speciales must be less than 500 characters")
];

// ✏️ UPDATE ORDER ITEM VALIDATOR
export const updateOrderItemValidator = [
  param("id")
    .notEmpty().withMessage("Order item ID is required")
    .isUUID().withMessage("Order item ID must be a valid UUID"),

  body("quantite")
    .optional()
    .isInt({ min: 1 }).withMessage("quantite must be at least 1"),

  body("instructions_speciales")
    .optional()
    .isString().withMessage("instructions_speciales must be a string")
    .isLength({ max: 500 }).withMessage("instructions_speciales must be less than 500 characters")
];

// 🔍 GET ORDER ITEM BY ID VALIDATOR
export const orderItemByIdValidator = [
  param("id")
    .notEmpty().withMessage("Order item ID is required")
    .isUUID().withMessage("Order item ID must be a valid UUID")
];

// 📋 GET ORDER ITEMS BY ORDER ID VALIDATOR
export const getOrderItemsByOrderValidator = [
  param("order_id")
    .notEmpty().withMessage("Order ID is required")
    .isUUID().withMessage("Order ID must be a valid UUID")
];

// ❌ DELETE ORDER ITEM VALIDATOR
export const deleteOrderItemValidator = [
  param("id")
    .notEmpty().withMessage("Order item ID is required")
    .isUUID().withMessage("Order item ID must be a valid UUID")
];

// 🔄 BULK CREATE ORDER ITEMS VALIDATOR
export const bulkCreateOrderItemsValidator = [
  body("order_id")
    .notEmpty().withMessage("order_id is required")
    .isUUID().withMessage("order_id must be a valid UUID"),

  body("items")
    .isArray({ min: 1 }).withMessage("items must be a non-empty array"),

  body("items.*.menu_item_id")
    .notEmpty().withMessage("menu_item_id is required for each item")
    .isUUID().withMessage("menu_item_id must be a valid UUID"),

  body("items.*.quantite")
    .notEmpty().withMessage("quantite is required for each item")
    .isInt({ min: 1 }).withMessage("quantite must be at least 1"),

  body("items.*.instructions_speciales")
    .optional()
    .isString().withMessage("instructions_speciales must be a string")
    .isLength({ max: 500 }).withMessage("instructions_speciales must be less than 500 characters")
];