import express from "express";
import {
  addFavoriteRestaurant,
  removeFavoriteRestaurant,
  getFavoriteRestaurants,
  updateFavoriteRestaurant
} from "../controllers/favoriteRestaurant.controller.js";
import { addFavoriteRestaurantValidator, removeFavoriteValidator, getFavoritesValidator, updateFavoriteRestaurantValidator } from "../validators/favoriteRestaurantValidator.js";
import { validate } from "../middlewares/validate.js";


const router = express.Router();
// ⭐ Add a restaurant to favorites
router.post("/create", addFavoriteRestaurantValidator, validate, addFavoriteRestaurant);

// ❌ Remove a restaurant from favorites
router.delete("/delete/:favorite_uuid", removeFavoriteValidator, validate, removeFavoriteRestaurant);

// 📋 Get all favorites for a client
router.get("/getclientfavorites", getFavoritesValidator, validate, getFavoriteRestaurants);

// 🔄 Update a favorite (notes/tags)
router.patch("/update/:favorite_uuid", updateFavoriteRestaurantValidator, validate, updateFavoriteRestaurant);
export default router;