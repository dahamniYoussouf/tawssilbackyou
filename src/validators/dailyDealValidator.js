import { body, param } from "express-validator";

export const createDailyDealValidator = [
  body("promotion_id")
    .notEmpty()
    .withMessage("Promotion ID is required")
    .isUUID()
    .withMessage("Promotion ID must be a valid UUID"),

  body("start_date")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  body("end_date")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .bail()
    .custom((value, { req }) => {
      const start = new Date(req.body.start_date);
      const end = new Date(value);
      if (end <= start) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be boolean")
];

export const updateDailyDealValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid daily deal UUID"),

  body("promotion_id")
    .optional()
    .isUUID()
    .withMessage("Promotion ID must be a valid UUID"),

  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .bail()
    .custom((value, { req }) => {
      if (req.body.start_date && value) {
        const start = new Date(req.body.start_date);
        const end = new Date(value);
        if (end <= start) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be boolean")
];

export const deleteDailyDealValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid daily deal UUID")
];
