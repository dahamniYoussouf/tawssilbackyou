import { body, param } from "express-validator";

export const createMenuItemValidator = [
  body("restaurant_id").isUUID().withMessage("Restaurant UUID is required"),
  body("category_id").isUUID().withMessage("Category UUID is required"),
  body("nom").notEmpty().withMessage("Dish name is required"),
  body("prix").isDecimal().withMessage("Price must be a valid decimal"),
  body("photo_url").optional().isURL().withMessage("Photo URL must be valid"),
  body("disponible").optional().isBoolean().withMessage("Disponibility must be boolean"),
];

export const updateMenuItemValidator = [
  param("id").isUUID().withMessage("Invalid menu item UUID"),
  body("prix").optional().isDecimal().withMessage("Price must be valid"),
  body("photo_url").optional().isURL().withMessage("Photo URL must be valid"),
  body("disponible").optional().isBoolean().withMessage("Disponibility must be boolean"),
];

export const deleteMenuItemValidator = [
  param("id").isUUID().withMessage("Invalid menu item UUID"),
];
