import { body, param, query } from "express-validator";

// ----------------------------
// Validator for adding a favorite restaurant
// ----------------------------
export const addFavoriteRestaurantValidator = [
  body("client_id")
    .notEmpty()
    .withMessage("client_id is required")
    .isUUID()
    .withMessage("client_id must be a valid UUID"),

  body("restaurant_id")
    .notEmpty()
    .withMessage("restaurant_id is required")
    .isUUID()
    .withMessage("restaurant_id must be a valid UUID"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("tags must be an array")
    .custom((tags) => {
      if (tags && tags.length > 0) {
        const allStrings = tags.every(tag => typeof tag === "string");
        if (!allStrings) {
          throw new Error("All tags must be strings");
        }
        const allValid = tags.every(tag => tag.length <= 50);
        if (!allValid) {
          throw new Error("Each tag cannot exceed 50 characters");
        }
      }
      return true;
    })
];

// ----------------------------
// Validator for removing a favorite (restaurant or meal)
// ----------------------------
export const removeFavoriteValidator = [
  param("favorite_uuid")
    .notEmpty()
    .withMessage("favorite_uuid is required")
    .isUUID()
    .withMessage("favorite_uuid must be a valid UUID")
];

// ----------------------------
// Validator for getting favorites list
// ----------------------------
export const getFavoritesValidator = [
  query("client_id")
    .notEmpty()
    .withMessage("client_id is required")
    .isUUID()
    .withMessage("client_id must be a valid UUID"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),

  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("pageSize must be between 1 and 100")
];

// ----------------------------
// Validator for updating a favorite restaurant
// ----------------------------
export const updateFavoriteRestaurantValidator = [
  param("favorite_uuid")
    .notEmpty()
    .withMessage("favorite_uuid is required")
    .isUUID()
    .withMessage("favorite_uuid must be a valid UUID"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("tags must be an array")
    .custom((tags) => {
      if (tags && tags.length > 0) {
        const allStrings = tags.every(tag => typeof tag === "string");
        if (!allStrings) {
          throw new Error("All tags must be strings");
        }
        const allValid = tags.every(tag => tag.length <= 50);
        if (!allValid) {
          throw new Error("Each tag cannot exceed 50 characters");
        }
      }
      return true;
    })
];


// ----------------------------
// Validator for checking if item is favorite
// ----------------------------
export const checkFavoriteValidator = [
  query("client_id")
    .notEmpty()
    .withMessage("client_id is required")
    .isUUID()
    .withMessage("client_id must be a valid UUID"),

  query("restaurant_id")
    .optional()
    .isUUID()
    .withMessage("restaurant_id must be a valid UUID"),

  query("meal_id")
    .optional()
    .isUUID()
    .withMessage("meal_id must be a valid UUID")
    .custom((value, { req }) => {
      // At least one of restaurant_id or meal_id must be provided
      if (!req.query.restaurant_id && !value) {
        throw new Error("Either restaurant_id or meal_id must be provided");
      }
      return true;
    })
];

// ----------------------------
// Validator for searching favorites
// ----------------------------
export const searchFavoritesValidator = [
  query("client_id")
    .notEmpty()
    .withMessage("client_id is required")
    .isUUID()
    .withMessage("client_id must be a valid UUID"),

  query("q")
    .optional()
    .isString()
    .withMessage("Search query must be a string")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),

  query("type")
    .optional()
    .isIn(["restaurant", "meal"])
    .withMessage("type must be either 'restaurant' or 'meal'"),

  query("tags")
    .optional()
    .isString()
    .withMessage("tags must be a comma-separated string")
];

