import { body, param } from "express-validator";

const promotionTypes = ["percentage", "amount", "free_delivery", "buy_x_get_y", "other"];
const promotionScopes = ["menu_item", "restaurant", "cart", "delivery", "global"];

const requireIf = (condition, message) => (value, { req }) => {
  if (condition(req) && (value === undefined || value === null || value === "")) {
    throw new Error(message);
  }
  return true;
};

export const createPromotionValidator = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn(promotionTypes)
    .withMessage(`Type must be one of: ${promotionTypes.join(", ")}`),

  body("scope")
    .optional()
    .isIn(promotionScopes)
    .withMessage(`Scope must be one of: ${promotionScopes.join(", ")}`),

  body("restaurant_id")
    .optional()
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),

  body("menu_item_id")
    .optional()
    .isUUID()
    .withMessage("Menu item ID must be a valid UUID"),

  body("menu_item_ids")
    .optional()
    .isArray()
    .withMessage("menu_item_ids must be an array of UUIDs")
    .bail()
    .custom((value) => {
      if (!value.length) {
        throw new Error("menu_item_ids must contain at least one item");
      }
      return true;
    })
    .custom((array) => {
      for (const item of array) {
        if (typeof item !== "string" || !item.match(/^[0-9a-fA-F-]{36}$/)) {
          throw new Error("Each menu_item_id must be a valid UUID");
        }
      }
      return true;
    }),

  body("discount_value")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Discount value must be greater than zero")
    .bail()
    .custom(requireIf(
      (req) => ["percentage", "amount"].includes(req.body.type),
      "Discount value is required for percentage or amount promotions"
    )),

  body("currency")
    .optional()
    .isString()
    .withMessage("Currency must be a string"),

  body("badge_text")
    .optional()
    .isLength({ max: 80 })
    .withMessage("Badge text cannot exceed 80 characters"),

  body("custom_message")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Custom message cannot exceed 500 characters"),

  body("buy_quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("buy_quantity must be a positive integer")
    .bail()
    .custom(requireIf(
      (req) => req.body.type === "buy_x_get_y",
      "buy_quantity is required for buy_x_get_y promotions"
    )),

  body("free_quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("free_quantity must be a positive integer")
    .bail()
    .custom(requireIf(
      (req) => req.body.type === "buy_x_get_y",
      "free_quantity is required for buy_x_get_y promotions"
    )),

  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("start_date must be a valid ISO 8601 date"),

  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("end_date must be a valid ISO 8601 date")
    .bail()
    .custom(requireIf(
      (req) => Boolean(req.body.start_date),
      "end_date must be after start_date"
    ))
    .custom((value, { req }) => {
      if (req.body.start_date && value) {
        const start = new Date(req.body.start_date);
        const end = new Date(value);
        if (end <= start) {
          throw new Error("end_date must be after start_date");
        }
      }
      return true;
    }),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean value"),

  body()
    .custom((_, { req }) => {
      const type = req.body.type;
      const hasMenuItemTarget =
        Boolean(req.body.menu_item_id) ||
        (Array.isArray(req.body.menu_item_ids) && req.body.menu_item_ids.length > 0);
      if (type === "buy_x_get_y" && !req.body.menu_item_id) {
        throw new Error("menu_item_id is required for buy_x_get_y promotions");
      }
      if ((type === "percentage" || type === "amount") && !req.body.restaurant_id && !hasMenuItemTarget) {
        throw new Error("Provide at least one menu_item_id or a restaurant_id for percentage/amount promotions");
      }
      if ((type === "percentage" || type === "amount") && !req.body.discount_value) {
        throw new Error("Discount value is required for percentage or amount promotions");
      }
      if (type === "other" && !req.body.custom_message) {
        throw new Error("Custom message is required for type 'other'");
      }
      return true;
    })
];

export const updatePromotionValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid promotion UUID"),

  body("title")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Description cannot exceed 1000 characters"),

  body("type")
    .optional()
    .isIn(promotionTypes)
    .withMessage(`Type must be one of: ${promotionTypes.join(", ")}`),

  body("scope")
    .optional()
    .isIn(promotionScopes)
    .withMessage(`Scope must be one of: ${promotionScopes.join(", ")}`),

  body("restaurant_id")
    .optional()
    .isUUID()
    .withMessage("Restaurant ID must be a valid UUID"),

  body("menu_item_id")
    .optional()
    .isUUID()
    .withMessage("Menu item ID must be a valid UUID"),

  body("menu_item_ids")
    .optional()
    .isArray()
    .withMessage("menu_item_ids must be an array of UUIDs")
    .bail()
    .custom((value) => {
      for (const item of value) {
        if (typeof item !== "string" || !item.match(/^[0-9a-fA-F-]{36}$/)) {
          throw new Error("Each menu_item_id must be a valid UUID");
        }
      }
      return true;
    }),

  body("discount_value")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Discount value must be greater than zero"),

  body("badge_text")
    .optional()
    .isLength({ max: 80 })
    .withMessage("Badge text cannot exceed 80 characters"),

  body("custom_message")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Custom message cannot exceed 500 characters"),

  body("buy_quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("buy_quantity must be a positive integer"),

  body("free_quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("free_quantity must be a positive integer"),

  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("start_date must be a valid ISO 8601 date"),

  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("end_date must be a valid ISO 8601 date")
    .bail()
    .custom((value, { req }) => {
      if (req.body.start_date && value) {
        const start = new Date(req.body.start_date);
        const end = new Date(value);
        if (end <= start) {
          throw new Error("end_date must be after start_date");
        }
      }
      return true;
    }),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean value")
];

export const deletePromotionValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid promotion UUID")
];
