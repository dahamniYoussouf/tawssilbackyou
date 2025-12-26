import { body, param, query } from "express-validator";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";

const isAssetPath = (value) => /^\/?assets\/[A-Za-z0-9._/-]+$/.test(value);

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidIconUrl = (value) => isHttpUrl(value) || isAssetPath(value);

// ----------------------------
// Validator for creating a client
// ----------------------------
export const createClientValidator = [
  body("first_name")
    .notEmpty()
    .withMessage("First name is required"),

  body("last_name")
    .notEmpty()
    .withMessage("Last name is required"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Email must be valid"),

  body("phone_number")
    .notEmpty()
    .withMessage("Phone number is required")
    .customSanitizer((value) => normalizePhoneNumber(value))
    .matches(/^213\d{9,}$/)
    .withMessage("Invalid phone number format (must start with 213)"),

  body("address")
    .optional()
    .isString()
    .withMessage("Address must be a string"),

  body("lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a valid number"),

  body("lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a valid number"),

  body("profile_image_url")
    .optional()
    .isURL()
    .withMessage("Profile image URL must be valid"),

  body("loyalty_points")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Loyalty points must be a positive integer"),

  body("is_verified")
    .optional()
    .isBoolean()
    .withMessage("is_verified must be true or false"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),

  body("status")
    .optional()
    .isIn(["active", "inactive", "banned"])
    .withMessage("Status must be one of: active, inactive, banned"),
];

// ----------------------------
// Validator for updating a client
// ----------------------------
export const updateClientValidator = [


  body("first_name")
    .optional()
    .notEmpty()
    .withMessage("First name cannot be empty"),

  body("last_name")
    .optional()
    .notEmpty()
    .withMessage("Last name cannot be empty"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Email must be valid"),

  body("phone_number")
    .optional()
    .notEmpty()
    .withMessage("Phone number cannot be empty")
    .customSanitizer((value) => value ? normalizePhoneNumber(value) : value)
    .matches(/^213\d{9,}$/)
    .withMessage("Invalid phone number format (must start with 213)"),

  body("address")
    .optional()
    .isString()
    .withMessage("Address must be a string"),

  body("lat")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a valid number"),

  body("lng")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a valid number"),

  body("profile_image_url")
    .optional()
    .isURL()
    .withMessage("Profile image URL must be valid"),

  body("loyalty_points")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Loyalty points must be a positive integer"),

  body("is_verified")
    .optional()
    .isBoolean()
    .withMessage("is_verified must be true or false"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be true or false"),

  body("status")
    .optional()
    .isIn(["active", "inactive", "banned"])
    .withMessage("Status must be one of: active, inactive, banned"),
];

// ----------------------------
// Validator for deleting a client
// ----------------------------
export const deleteClientValidator = [
  param("id")
    .isUUID()
    .withMessage("Invalid client UUID"),
];

// ----------------------------
// Validator for getting all clients (with pagination)
// ----------------------------
export const getAllClientsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("PageSize must be between 1 and 100"),

  query("search")
    .optional()
    .isString()
    .withMessage("Search must be a string")
    .isLength({ min: 2, max: 100 })
    .withMessage("Search must be between 2 and 100 characters")
];



/**
 * Validator for getting client's orders with filters
 */
export const getMyOrdersValidator = [
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

// Favorite addresses
export const favoriteAddressCreateValidator = [
  body("name").notEmpty().withMessage("Le nom de l'adresse est requis"),
  body("address").notEmpty().withMessage("L'adresse est requise"),
  body("icon_url")
    .optional()
    .custom((value) => {
      if (!value) return true;
      if (isValidIconUrl(value)) return true;
      throw new Error("icon_url doit etre une URL valide ou un chemin assets/...");
    }),
  body("lat").isFloat({ min: -90, max: 90 }).withMessage("Latitude invalide"),
  body("lng").isFloat({ min: -180, max: 180 }).withMessage("Longitude invalide"),
  body("is_default").optional().isBoolean().withMessage("is_default doit être un booléen"),
];

export const favoriteAddressUpdateValidator = [
  body("name").optional().isString(),
  body("address").optional().isString(),
  body("icon_url")
    .optional()
    .custom((value) => {
      if (!value) return true;
      if (isValidIconUrl(value)) return true;
      throw new Error("icon_url doit etre une URL valide ou un chemin assets/...");
    }),
  body("lat").optional().isFloat({ min: -90, max: 90 }).withMessage("Latitude invalide"),
  body("lng").optional().isFloat({ min: -180, max: 180 }).withMessage("Longitude invalide"),
  body("is_default").optional().isBoolean().withMessage("is_default doit être un booléen"),
];

export const favoriteAddressIdValidator = [
  param("id").notEmpty().withMessage("id requis"),
];
