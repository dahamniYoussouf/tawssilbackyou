import { body, query, param } from "express-validator";

export const createRestaurantValidator = [
  body("name")
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),

  body("description")
    .optional()
    .isString().withMessage("Description must be a string"),

  body("address")
    .optional()
    .isString().withMessage("Address must be a string"),

  body("lat")
    .notEmpty().withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 }).withMessage("Latitude must be between -90 and 90"),

  body("lng")
    .notEmpty().withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 }).withMessage("Longitude must be between -180 and 180"),

  body("rating")
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage("Rating must be between 0 and 5"),

  body("delivery_time_min")
    .optional()
    .isInt({ min: 0 }).withMessage("delivery_time_min must be >= 0"),

  body("delivery_time_max")
    .optional()
    .isInt({ min: 0 }).withMessage("delivery_time_max must be >= 0"),

  body("image_url")
    .optional()
    .isURL().withMessage("image_url must be a valid URL"),

  body("is_active")
    .optional()
    .isBoolean().withMessage("is_active must be true or false"),

  body("is_premium")
    .optional()
    .isBoolean().withMessage("is_premium must be true or false"),
    
  body("status")
  .optional()
  .isIn(["pending", "approved", "suspended", "archived"])
  .withMessage("Status must be one of: pending, approved, suspended, archived"),

  body("opening_hours")
  .optional()
  .isObject().withMessage("opening_hours must be a valid object")
  .custom(value => {
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    for (const [day, hours] of Object.entries(value)) {
      if (!days.includes(day)) {
        throw new Error(`Invalid day '${day}' in opening_hours`);
      }
      if (typeof hours.open !== "number" || typeof hours.close !== "number") {
        throw new Error(`Each day must have numeric 'open' and 'close' times (e.g., 900, 1800)`);
      }
    }
    return true;
  }),
];

export const nearbyRestaurantValidator = [
  query("lat")
    .notEmpty().withMessage("Latitude (lat) is required")
    .isFloat({ min: -90, max: 90 }).withMessage("Latitude must be between -90 and 90"),

  query("lng")
    .notEmpty().withMessage("Longitude (lng) is required")
    .isFloat({ min: -180, max: 180 }).withMessage("Longitude must be between -180 and 180"),

  query("radius")
    .optional()
    .isInt({ min: 1, max: 50000 }).withMessage("Radius must be between 1 and 50000 meters"),
];

export const updateRestaurantValidator = [
  param("uuid")
    .notEmpty().withMessage("UUID is required")
    .isUUID().withMessage("Invalid UUID format"),

  body("name")
    .optional()
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),

  body("description")
    .optional()
    .isString().withMessage("Description must be a string"),

  body("address")
    .optional()
    .isString().withMessage("Address must be a string"),

  body("lat")
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage("Latitude must be between -90 and 90"),

  body("lng")
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage("Longitude must be between -180 and 180"),

  body("rating")
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage("Rating must be between 0 and 5"),

  body("delivery_time_min")
    .optional()
    .isInt({ min: 0 }).withMessage("delivery_time_min must be >= 0"),

  body("delivery_time_max")
    .optional()
    .isInt({ min: 0 }).withMessage("delivery_time_max must be >= 0"),

  body("image_url")
    .optional()
    .isURL().withMessage("image_url must be a valid URL"),

  body("is_active")
    .optional()
    .isBoolean().withMessage("is_active must be true or false"),

  body("is_premium")
    .optional()
    .isBoolean().withMessage("is_premium must be true or false"),

  body("status")
  .optional()
  .isIn(["pending", "approved", "suspended", "archived"])
  .withMessage("Status must be one of: pending, approved, suspended, archived"),

  body("opening_hours")
    .optional()
    .isObject().withMessage("opening_hours must be a valid object")
    .custom(value => {
      const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      for (const [day, hours] of Object.entries(value)) {
        if (!days.includes(day)) {
          throw new Error(`Invalid day '${day}' in opening_hours`);
        }
        if (typeof hours.open !== "number" || typeof hours.close !== "number") {
          throw new Error(`Each day must have numeric 'open' and 'close' times`);
        }
      }
      return true;
    }),

];


export const deleteRestaurantValidator = [
  param("uuid")
    .notEmpty().withMessage("UUID is required")
    .isUUID().withMessage("Invalid UUID format"),
];

export const nearbyFilterValidator = [
  // Address validation (optional)
  query("address")
    .optional()
    .isString().withMessage("Address must be a string")
    .isLength({ min: 3 }).withMessage("Address must be at least 3 characters long"),

  // Latitude validation (optional if address provided)
  query("lat")
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage("Latitude must be between -90 and 90"),

  // Longitude validation (optional if address provided)
  query("lng")
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage("Longitude must be between -180 and 180"),

  // Radius validation
  query("radius")
    .optional()
    .isInt({ min: 1, max: 50000 }).withMessage("Radius must be between 1 and 50000 meters"),

  // Search query validation
  query("q")
    .optional()
    .isString().withMessage("Search query must be a string")
    .isLength({ min: 1, max: 100 }).withMessage("Search query must be between 1 and 100 characters"),

  // Category validation
  query("category")
    .optional()
    .isString().withMessage("Category must be a string")
    .matches(/^[a-zA-Z0-9\-_]+$/).withMessage("Category must contain only alphanumeric characters, hyphens, and underscores"),

  // Custom validation to ensure either address OR coordinates are provided
  query("address")
    .custom((value, { req }) => {
      const { lat, lng } = req.query;
      
      // If address is provided, we're good
      if (value && value.trim()) {
        return true;
      }
      
      // If no address, check for coordinates
      if (!lat || !lng) {
        throw new Error("Either 'address' or both 'lat' and 'lng' parameters are required");
      }
      
      return true;
    }),

  // Additional validation for coordinates when used without address
  query("lat")
    .custom((value, { req }) => {
      const { address, lng } = req.query;
      
      // If address is provided, coordinates are optional
      if (address && address.trim()) {
        return true;
      }
      
      // If no address, both lat and lng are required
      if (!value || !lng) {
        throw new Error("Both 'lat' and 'lng' are required when 'address' is not provided");
      }
      
      return true;
    }),

  query("lng")
    .custom((value, { req }) => {
      const { address, lat } = req.query;
      
      // If address is provided, coordinates are optional
      if (address && address.trim()) {
        return true;
      }
      
      // If no address, both lat and lng are required
      if (!value || !lat) {
        throw new Error("Both 'lat' and 'lng' are required when 'address' is not provided");
      }
      
      return true;
    }),
];
