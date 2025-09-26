import { body, param } from "express-validator";

export const createFoodCategoryValidator = [
  body("nom").notEmpty().withMessage("Category name is required"),
  body("icone_url").optional().isURL().withMessage("Icon URL must be valid"),
  body("ordre_affichage").optional().isInt().withMessage("Order must be an integer"),
];

export const updateFoodCategoryValidator = [
  param("id").isUUID().withMessage("Invalid category UUID"),
  body("nom").optional().notEmpty().withMessage("Category name cannot be empty"),
  body("icone_url").optional().isURL().withMessage("Icon URL must be valid"),
  body("ordre_affichage").optional().isInt().withMessage("Order must be an integer"),
];

export const deleteFoodCategoryValidator = [
  param("id").isUUID().withMessage("Invalid category UUID"),
];
