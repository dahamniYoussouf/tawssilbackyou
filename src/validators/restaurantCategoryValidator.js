import { body, param } from "express-validator";

export const createRestaurantCategoryValidator = [
  body("nom").notEmpty().withMessage("Category name is required"),
  body("icone_url").optional().isURL().withMessage("Icon URL must be valid"),
  body("ordre_affichage").optional().isInt().withMessage("Order must be an integer"),
];

export const updateRestaurantCategoryValidator = [
  param("id").isUUID().withMessage("Invalid category UUID"),
  body("nom").optional().notEmpty().withMessage("Category name cannot be empty"),
  body("icone_url").optional().isURL().withMessage("Icon URL must be valid"),
  body("ordre_affichage").optional().isInt().withMessage("Order must be an integer"),
];

export const deleteRestaurantCategoryValidator = [
  param("id").isUUID().withMessage("Invalid category UUID"),
];
