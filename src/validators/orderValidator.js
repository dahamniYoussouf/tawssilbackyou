import { body, query, param } from "express-validator";

// 🆕 CREATE ORDER VALIDATOR
export const createOrderValidator = [
  body("client_id")
    .notEmpty().withMessage("client_id is required")
    .isUUID().withMessage("client_id must be a valid UUID"),

  body("restaurant_id")
    .notEmpty().withMessage("restaurant_id is required")
    .isUUID().withMessage("restaurant_id must be a valid UUID"),

  body("order_type")
    .optional()
    .isIn(["delivery", "pickup"]).withMessage("order_type must be 'delivery' or 'pickup'"),

  body("subtotal")
    .notEmpty().withMessage("subtotal is required")
    .isFloat({ min: 0 }).withMessage("subtotal must be a positive number"),

  body("delivery_fee")
    .optional()
    .isFloat({ min: 0 }).withMessage("delivery_fee must be a positive number"),

  body("service_fee")
    .optional()
    .isFloat({ min: 0 }).withMessage("service_fee must be a positive number"),

  body("tax_amount")
    .optional()
    .isFloat({ min: 0 }).withMessage("tax_amount must be a positive number"),

  body("discount_amount")
    .optional()
    .isFloat({ min: 0 }).withMessage("discount_amount must be a positive number"),

  body("tip_amount")
    .optional()
    .isFloat({ min: 0 }).withMessage("tip_amount must be a positive number"),

  body("payment_method")
    .optional()
    .isIn(["baridi_mob", "cash_on_delivery", "bank_transfer"])
    .withMessage("payment_method must be 'baridi_mob', 'cash_on_delivery', or 'bank_transfer'"),

  // Validation conditionnelle pour delivery
  body("delivery_address")
    .custom((value, { req }) => {
      if (req.body.order_type === 'delivery' && !value) {
        throw new Error("delivery_address is required for delivery orders");
      }
      return true;
    }),

  body("lat")
    .custom((value, { req }) => {
      if (req.body.order_type === 'delivery') {
        if (!value) throw new Error("lat is required for delivery orders");
        if (isNaN(value) || value < -90 || value > 90) {
          throw new Error("lat must be between -90 and 90");
        }
      }
      return true;
    }),

  body("lng")
    .custom((value, { req }) => {
      if (req.body.order_type === 'delivery') {
        if (!value) throw new Error("lng is required for delivery orders");
        if (isNaN(value) || value < -180 || value > 180) {
          throw new Error("lng must be between -180 and 180");
        }
      }
      return true;
    }),

  body("pickup_time")
    .optional()
    .isISO8601().withMessage("pickup_time must be a valid ISO8601 date"),

  body("scheduled_for")
    .optional()
    .isISO8601().withMessage("scheduled_for must be a valid ISO8601 date"),

  body("is_scheduled")
    .optional()
    .isBoolean().withMessage("is_scheduled must be true or false"),

  body("delivery_instructions")
    .optional()
    .isString().withMessage("delivery_instructions must be a string")
    .isLength({ max: 500 }).withMessage("delivery_instructions must be less than 500 characters"),

  body("pickup_instructions")
    .optional()
    .isString().withMessage("pickup_instructions must be a string")
    .isLength({ max: 500 }).withMessage("pickup_instructions must be less than 500 characters"),

  body("special_requests")
    .optional()
    .isString().withMessage("special_requests must be a string")
    .isLength({ max: 1000 }).withMessage("special_requests must be less than 1000 characters"),

  body("coupon_code")
    .optional()
    .isString().withMessage("coupon_code must be a string")
    .matches(/^[A-Z0-9]{3,20}$/).withMessage("coupon_code must be 3-20 alphanumeric characters")
];

// ✏️ UPDATE ORDER VALIDATOR
export const updateOrderValidator = [
  param("id")
    .notEmpty().withMessage("Order ID is required")
    .isUUID().withMessage("Order ID must be a valid UUID"),

  body("subtotal")
    .optional()
    .isFloat({ min: 0 }).withMessage("subtotal must be a positive number"),

  body("delivery_fee")
    .optional()
    .isFloat({ min: 0 }).withMessage("delivery_fee must be a positive number"),

  body("service_fee")
    .optional()
    .isFloat({ min: 0 }).withMessage("service_fee must be a positive number"),

  body("tax_amount")
    .optional()
    .isFloat({ min: 0 }).withMessage("tax_amount must be a positive number"),

  body("discount_amount")
    .optional()
    .isFloat({ min: 0 }).withMessage("discount_amount must be a positive number"),

  body("tip_amount")
    .optional()
    .isFloat({ min: 0 }).withMessage("tip_amount must be a positive number"),

  body("payment_method")
    .optional()
    .isIn(["baridi_mob", "cash_on_delivery", "bank_transfer"])
    .withMessage("payment_method must be 'baridi_mob', 'cash_on_delivery', or 'bank_transfer'"),

  body("delivery_instructions")
    .optional()
    .isString().withMessage("delivery_instructions must be a string")
    .isLength({ max: 500 }).withMessage("delivery_instructions must be less than 500 characters"),

  body("pickup_instructions")
    .optional()
    .isString().withMessage("pickup_instructions must be a string")
    .isLength({ max: 500 }).withMessage("pickup_instructions must be less than 500 characters"),

  body("special_requests")
    .optional()
    .isString().withMessage("special_requests must be a string")
    .isLength({ max: 1000 }).withMessage("special_requests must be less than 1000 characters"),

  body("pickup_time")
    .optional()
    .isISO8601().withMessage("pickup_time must be a valid ISO8601 date"),

  body("scheduled_for")
    .optional()
    .isISO8601().withMessage("scheduled_for must be a valid ISO8601 date")
];

// 🔄 UPDATE STATUS VALIDATOR
export const updateOrderStatusValidator = [
  param("id")
    .notEmpty().withMessage("Order ID is required")
    .isUUID().withMessage("Order ID must be a valid UUID"),

  body("status")
    .notEmpty().withMessage("status is required")
    .isIn(["pending", "confirmed", "preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled", "refunded"])
    .withMessage("Invalid status value"),

  body("cancellation_reason")
    .custom((value, { req }) => {
      if (req.body.status === 'cancelled' && !value) {
        throw new Error("cancellation_reason is required when status is 'cancelled'");
      }
      return true;
    })
    .optional()
    .isString().withMessage("cancellation_reason must be a string")
    .isLength({ max: 500 }).withMessage("cancellation_reason must be less than 500 characters"),

  body("cancelled_by")
    .custom((value, { req }) => {
      if (req.body.status === 'cancelled' && !value) {
        throw new Error("cancelled_by is required when status is 'cancelled'");
      }
      return true;
    })
    .optional()
    .isIn(["customer", "restaurant", "system", "admin"])
    .withMessage("cancelled_by must be 'customer', 'restaurant', 'system', or 'admin'")
];

// 💳 UPDATE PAYMENT STATUS VALIDATOR
export const updatePaymentStatusValidator = [
  param("id")
    .notEmpty().withMessage("Order ID is required")
    .isUUID().withMessage("Order ID must be a valid UUID"),

  body("payment_status")
    .notEmpty().withMessage("payment_status is required")
    .isIn(["pending", "processing", "paid", "failed", "refunded", "partially_refunded"])
    .withMessage("Invalid payment_status value"),

  body("payment_method")
    .optional()
    .isIn(["baridi_mob", "cash_on_delivery", "bank_transfer"])
    .withMessage("payment_method must be 'baridi_mob', 'cash_on_delivery', or 'bank_transfer'")
];

// 🚚 ASSIGN DELIVERY PERSON VALIDATOR
export const assignDeliveryPersonValidator = [
  param("id")
    .notEmpty().withMessage("Order ID is required")
    .isUUID().withMessage("Order ID must be a valid UUID"),

  body("livreur_id")
    .notEmpty().withMessage("livreur_id is required")
    .isUUID().withMessage("livreur_id must be a valid UUID")
];

// ⭐ ADD RATING VALIDATOR
export const addRatingValidator = [
  param("id")
    .notEmpty().withMessage("Order ID is required")
    .isUUID().withMessage("Order ID must be a valid UUID"),

  body("rating")
    .notEmpty().withMessage("rating is required")
    .isFloat({ min: 1, max: 5 }).withMessage("rating must be between 1 and 5"),

  body("review_comment")
    .optional()
    .isString().withMessage("review_comment must be a string")
    .isLength({ max: 1000 }).withMessage("review_comment must be less than 1000 characters")
];

// 📋 GET ALL ORDERS VALIDATOR
export const getAllOrdersValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(["pending", "confirmed", "preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled", "refunded"])
    .withMessage("Invalid status filter"),

  query("payment_status")
    .optional()
    .isIn(["pending", "processing", "paid", "failed", "refunded", "partially_refunded"])
    .withMessage("Invalid payment_status filter"),

  query("order_type")
    .optional()
    .isIn(["delivery", "pickup"]).withMessage("order_type must be 'delivery' or 'pickup'"),

  query("client_id")
    .optional()
    .isUUID().withMessage("client_id must be a valid UUID"),

  query("restaurant_id")
    .optional()
    .isUUID().withMessage("restaurant_id must be a valid UUID"),

  query("date_from")
    .optional()
    .isISO8601().withMessage("date_from must be a valid ISO8601 date"),

  query("date_to")
    .optional()
    .isISO8601().withMessage("date_to must be a valid ISO8601 date"),

  query("search")
    .optional()
    .isString().withMessage("search must be a string")
    .isLength({ min: 3, max: 50 }).withMessage("search must be between 3 and 50 characters")
];

// 🔍 GET ORDER BY ID VALIDATOR
export const getOrderByIdValidator = [
  param("id")
    .notEmpty().withMessage("Order ID is required")
    .isUUID().withMessage("Order ID must be a valid UUID")
];

// ❌ DELETE ORDER VALIDATOR
export const deleteOrderValidator = [
  param("id")
    .notEmpty().withMessage("Order ID is required")
    .isUUID().withMessage("Order ID must be a valid UUID")
];

// 📊 GET ORDER STATISTICS VALIDATOR
export const getOrderStatisticsValidator = [
  query("period")
    .optional()
    .isIn(["7d", "30d", "90d"]).withMessage("period must be '7d', '30d', or '90d'"),

  query("restaurant_id")
    .optional()
    .isUUID().withMessage("restaurant_id must be a valid UUID")
];

// 👤 GET client ORDERS VALIDATOR
export const getClientOrdersValidator = [
  param("clientId")
    .notEmpty().withMessage("client ID is required")
    .isUUID().withMessage("client ID must be a valid UUID"),

  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("limit must be between 1 and 50"),

  query("status")
    .optional()
    .isIn(["pending", "confirmed", "preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled", "refunded"])
    .withMessage("Invalid status filter")
];