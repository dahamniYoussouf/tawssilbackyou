import { body, param } from "express-validator";

// ----------------------------
// Validator for creating an announcement
// ----------------------------
export const createAnnouncementValidator = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title cannot exceed 255 characters"),

  body("content")
    .notEmpty()
    .withMessage("Content is required"),

  body("css_styles")
    .optional()
    .isString()
    .withMessage("CSS styles must be a string"),

  body("js_scripts")
    .optional()
    .isString()
    .withMessage("JavaScript must be a string"),

  body("restaurant_id")
    .optional()
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),

  body("type")
    .optional()
    .isIn(["info", "success", "warning", "error"])
    .withMessage("Type must be one of: info, success, warning, error"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),

  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .custom((endDate, { req }) => {
      if (req.body.start_date && endDate) {
        const start = new Date(req.body.start_date);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    })
];

// ----------------------------
// Validator for updating an announcement
// ----------------------------
export const updateAnnouncementValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid announcement UUID"),

  body("title")
    .optional()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Title cannot exceed 255 characters"),

  body("content")
    .optional()
    .notEmpty()
    .withMessage("Content cannot be empty"),

  body("css_styles")
    .optional()
    .isString()
    .withMessage("CSS styles must be a string"),

  body("js_scripts")
    .optional()
    .isString()
    .withMessage("JavaScript must be a string"),

  body("restaurant_id")
    .optional()
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),

  body("type")
    .optional()
    .isIn(["info", "success", "warning", "error"])
    .withMessage("Type must be one of: info, success, warning, error"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),

  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .custom((endDate, { req }) => {
      if (req.body.start_date && endDate) {
        const start = new Date(req.body.start_date);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    })
];

// ----------------------------
// Validator for deleting an announcement
// ----------------------------
export const deleteAnnouncementValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid announcement UUID")
];
