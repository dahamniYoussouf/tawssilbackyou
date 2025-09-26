import { body, query } from "express-validator";

export const geocodeValidator = [
  body("address")
    .notEmpty().withMessage("address is required")
];