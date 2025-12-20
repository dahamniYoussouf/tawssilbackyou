import { body, param, query } from "express-validator";

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validator for creating a restaurant
 */
export const createRestaurantValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Restaurant name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Name must be between 2 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email must be a valid email address"),

  body("lat")
    .notEmpty()
    .withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("lng")
    .notEmpty()
    .withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("rating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be between 0 and 5"),

  body("image_url")
    .optional()
    .trim()
    .isURL()
    .withMessage("Image URL must be a valid URL"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),

  body("is_premium")
    .optional()
    .isBoolean()
    .withMessage("is_premium must be a boolean"),

  body("status")
    .optional()
    .isIn(["pending", "approved", "suspended", "archived"])
    .withMessage("Status must be one of: pending, approved, suspended, archived"),

  body("opening_hours")
    .optional()
    .isObject()
    .withMessage("Opening hours must be an object"),

  // NEW: Validate categories array
  body("categories")
    .notEmpty()
    .withMessage("Categories are required")
    .isArray({ min: 1 })
    .withMessage("Categories must be a non-empty array"),

  body("categories.*")
    .isString()
    .trim()
    .matches(CATEGORY_SLUG_PATTERN)
    .withMessage("Each category must be a slug (lowercase letters, numbers, hyphens)")
];

/**
 * Validator for updating a restaurant
 */
export const updateRestaurantValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid restaurant ID format"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Restaurant name cannot be empty")
    .isLength({ min: 2, max: 255 })
    .withMessage("Name must be between 2 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email must be a valid email address"),

  body("lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("rating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be between 0 and 5"),

  body("image_url")
    .optional()
    .trim()
    .isURL()
    .withMessage("Image URL must be a valid URL"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),

  body("is_premium")
    .optional()
    .isBoolean()
    .withMessage("is_premium must be a boolean"),

  body("status")
    .optional()
    .isIn(["pending", "approved", "suspended", "archived"])
    .withMessage("Status must be one of: pending, approved, suspended, archived"),

  body("opening_hours")
    .optional()
    .isObject()
    .withMessage("Opening hours must be an object"),

  // NEW: Validate categories array (optional for update)
  body("categories")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Categories must be a non-empty array"),

  body("categories.*")
    .optional()
    .isString()
    .trim()
    .matches(CATEGORY_SLUG_PATTERN)
    .withMessage("Each category must be a slug (lowercase letters, numbers, hyphens)")
];

/**
 * Validator for deleting a restaurant
 */
export const deleteRestaurantValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid restaurant ID format")
];

/**
 * Validator for nearby restaurants (coordinates)
 */
export const nearbyRestaurantValidator = [
  query("lat")
    .notEmpty()
    .withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  query("lng")
    .notEmpty()
    .withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  query("radius")
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage("Radius must be between 100 and 50000 meters")
];

/**
 * Validator for nearby filter (advanced search)
 */
export const nearbyFilterValidator = [


  body("address")
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage("Address must be between 3 and 500 characters"),

  body("lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),

  body("lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),

  body("radius")
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage("Radius must be between 100 and 50000 meters"),

  body("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Search query must be between 1 and 255 characters"),

  // NEW: Validate categories filter (can be string or array)
  body("categories")
    .optional()
    .custom((value) => {
      // Allow both string (comma-separated) and array
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      throw new Error('Categories must be a string or array');
    })
    .withMessage("Categories must be a non-empty string or array"),

  // NEW: Filter by HomeCategory ids (uuid string or array, comma-separated allowed)
  body("home_categories")
    .optional()
    .custom((value) => {
      const ids = typeof value === "string"
        ? value.split(",").map((item) => item.trim()).filter(Boolean)
        : Array.isArray(value)
          ? value.map((item) => String(item).trim()).filter(Boolean)
          : null;

      if (!ids) {
        throw new Error("home_categories must be a string or array");
      }

      if (ids.length === 0) {
        throw new Error("home_categories must be non-empty");
      }

      const invalid = ids.find((id) => !UUID_PATTERN.test(id));
      if (invalid) {
        throw new Error("home_categories must contain valid UUIDs");
      }

      return true;
    }),

  body("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  body("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Page size must be between 1 and 100"),

  // Custom validator to ensure either address or coordinates are provided
  body().custom((value) => {
    const hasAddress = value.address && value.address.trim();
    const hasCoords = value.lat && value.lng;
    
    if (!hasAddress && !hasCoords) {
      throw new Error('Either address or coordinates (lat, lng) must be provided');
    }
    
    return true;
  })
];


/**
 * Validator for getting restaurant statistics
 */
export const getRestaurantStatisticsValidator = [
  param("id")
    .optional()
    .isUUID()
    .withMessage("Invalid restaurant ID format"),

  query("date_from")
    .optional()
    .isISO8601()
    .withMessage("date_from must be a valid ISO 8601 date"),

  query("date_to")
    .optional()
    .isISO8601()
    .withMessage("date_to must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (req.query.date_from && value) {
        const from = new Date(req.query.date_from);
        const to = new Date(value);
        if (to < from) {
          throw new Error("date_to must be after date_from");
        }
      }
      return true;
    })
];


/**
 * Validator for getting restaurant orders history
 */
export const getRestaurantOrdersHistoryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .custom((value) => {
      const validStatuses = ['pending', 'accepted', 'preparing', 'assigned', 'arrived', 'delivering', 'delivered', 'declined'];
      
      // Allow single status or comma-separated list
      if (typeof value === 'string') {
        const statuses = value.split(',').map(s => s.trim());
        const allValid = statuses.every(s => validStatuses.includes(s));
        if (!allValid) {
          throw new Error('Invalid status value');
        }
      } else if (Array.isArray(value)) {
        const allValid = value.every(s => validStatuses.includes(s));
        if (!allValid) {
          throw new Error('Invalid status value');
        }
      }
      return true;
    })
    .withMessage("Status must be one of: pending, accepted, preparing, assigned, arrived, delivering, delivered, declined"),

  query("order_type")
    .optional()
    .isIn(['delivery', 'pickup'])
    .withMessage("Order type must be either 'delivery' or 'pickup'"),

  query("date_range")
    .optional()
    .isIn(['today', 'week', 'month'])
    .withMessage("Date range must be one of: today, week, month"),

  query("date_from")
    .optional()
    .isISO8601()
    .withMessage("date_from must be a valid ISO 8601 date"),

  query("date_to")
    .optional()
    .isISO8601()
    .withMessage("date_to must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (req.query.date_from && value) {
        const from = new Date(req.query.date_from);
        const to = new Date(value);
        if (to < from) {
          throw new Error("date_to must be after date_from");
        }
      }
      return true;
    }),

  query("min_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("min_price must be a positive number"),

  query("max_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("max_price must be a positive number")
    .custom((value, { req }) => {
      if (req.query.min_price && value) {
        const min = parseFloat(req.query.min_price);
        const max = parseFloat(value);
        if (max < min) {
          throw new Error("max_price must be greater than min_price");
        }
      }
      return true;
    }),

  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search must be between 1 and 100 characters")
    .trim()
];
