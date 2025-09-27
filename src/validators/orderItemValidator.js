import { body, param } from "express-validator";

// ----------------------------
// Validator for creating an order item
// ----------------------------
export const createOrderItemValidator = [
  body("order_id")
    .notEmpty()
    .withMessage("Order ID is required")
    .isUUID()
    .withMessage("Order ID must be a valid UUID"),

  body("menu_item_id")
    .notEmpty()
    .withMessage("Menu item ID is required")
    .isUUID()
    .withMessage("Menu item ID must be a valid UUID"),

  body("quantite")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),

  body("prix_unitaire")
    .notEmpty()
    .withMessage("Unit price is required")
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage("Unit price must be a valid decimal with up to 2 decimal places")
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error("Unit price must be greater than 0");
      }
      return true;
    }),

  body("prix_total")
    .notEmpty()
    .withMessage("Total price is required")
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage("Total price must be a valid decimal with up to 2 decimal places")
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error("Total price must be greater than 0");
      }
      return true;
    }),

  body("instructions_speciales")
    .optional()
    .isString()
    .withMessage("Special instructions must be a string")
    .isLength({ max: 500 })
    .withMessage("Special instructions cannot exceed 500 characters"),

  body("customizations")
    .optional()
    .custom((value) => {
      if (value && typeof value !== 'object') {
        throw new Error("Customizations must be a valid JSON object");
      }
      return true;
    }),

  body("statut")
    .optional()
    .isIn(["pending", "preparing", "ready", "delivered", "cancelled"])
    .withMessage("Status must be one of: pending, preparing, ready, delivered, cancelled"),
];

// ----------------------------
// Validator for updating an order item
// ----------------------------
export const updateOrderItemValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid order item UUID"),

  body("quantite")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),

  body("prix_unitaire")
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage("Unit price must be a valid decimal with up to 2 decimal places")
    .custom((value) => {
      if (value !== undefined && parseFloat(value) <= 0) {
        throw new Error("Unit price must be greater than 0");
      }
      return true;
    }),

  body("prix_total")
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage("Total price must be a valid decimal with up to 2 decimal places")
    .custom((value) => {
      if (value !== undefined && parseFloat(value) <= 0) {
        throw new Error("Total price must be greater than 0");
      }
      return true;
    }),

  body("instructions_speciales")
    .optional()
    .isString()
    .withMessage("Special instructions must be a string")
    .isLength({ max: 500 })
    .withMessage("Special instructions cannot exceed 500 characters"),

  body("customizations")
    .optional()
    .custom((value) => {
      if (value && typeof value !== 'object') {
        throw new Error("Customizations must be a valid JSON object");
      }
      return true;
    }),

  body("statut")
    .optional()
    .isIn(["pending", "preparing", "ready", "delivered", "cancelled"])
    .withMessage("Status must be one of: pending, preparing, ready, delivered, cancelled"),
];

// ----------------------------
// Validator for updating order item status
// ----------------------------
export const updateOrderItemStatusValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid order item UUID"),

  body("statut")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "preparing", "ready", "delivered", "cancelled"])
    .withMessage("Status must be one of: pending, preparing, ready, delivered, cancelled"),
];

// ----------------------------
// Validator for getting order items by order ID
// ----------------------------
export const getOrderItemsByOrderValidator = [
  param("order_id")
    .isUUID()
    .withMessage("Invalid order UUID"),
];

// ----------------------------
// Validator for getting/deleting a single order item
// ----------------------------
export const orderItemByIdValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid order item UUID"),
];

// ----------------------------
// Validator for deleting an order item
// ----------------------------
export const deleteOrderItemValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid order item UUID"),
];