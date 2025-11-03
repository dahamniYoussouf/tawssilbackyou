import { body } from "express-validator";

export const updateMaxOrdersValidator = [
  body("max_orders")
    .notEmpty().withMessage("max_orders is required")
    .isInt({ min: 1, max: 10 }).withMessage("max_orders must be between 1 and 10")
];

export const updateMaxDistanceValidator = [
  body("max_distance")
    .notEmpty().withMessage("max_distance is required")
    .isInt({ min: 100, max: 5000 }).withMessage("max_distance must be between 100 and 5000 meters")
];