import { body, param } from "express-validator";

export const createAdditionValidator = [
  body("menu_item_id")
    .notEmpty().withMessage("menu_item_id is required")
    .isUUID().withMessage("menu_item_id must be a valid UUID"),

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

  body("is_available")
    .optional()
    .isBoolean().withMessage("is_available must be true or false")
];

export const updateAdditionValidator = [
  param("id")
    .notEmpty().withMessage("Addition ID is required")
    .isUUID().withMessage("Addition ID must be a valid UUID"),

  body("menu_item_id")
    .optional()
    .isUUID().withMessage("menu_item_id must be a valid UUID"),

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

  body("is_available")
    .optional()
    .isBoolean().withMessage("is_available must be true or false")
];

export const deleteAdditionValidator = [
  param("id")
    .notEmpty().withMessage("Addition ID is required")
    .isUUID().withMessage("Addition ID must be a valid UUID")
];

export const getAdditionsByMenuItemValidator = [
  param("menu_item_id")
    .notEmpty().withMessage("menu_item_id is required")
    .isUUID().withMessage("menu_item_id must be a valid UUID")
];
