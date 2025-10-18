import express from "express";
import {
  addFavoriteRestaurant,
  removeFavoriteRestaurant,
  getFavoriteRestaurants,
  updateFavoriteRestaurant
} from "../controllers/favoriteRestaurant.controller.js";
import {
  addFavoriteRestaurantValidator,
  removeFavoriteRestaurantValidator,
  getFavoriteRestaurantsValidator,
  updateFavoriteRestaurantValidator
} from "../validators/favoriteRestaurantValidator.js";
import { validate } from "../middlewares/validate.js";
import { protect, isClient } from "../middlewares/auth.js";

const router = express.Router();

router.post("/create", protect, isClient, addFavoriteRestaurantValidator, validate, addFavoriteRestaurant);
router.delete("/delete/:favorite_uuid", protect, isClient, removeFavoriteRestaurantValidator, validate, removeFavoriteRestaurant);
router.get("/getclientfavorites", protect, isClient, getFavoriteRestaurantsValidator, validate, getFavoriteRestaurants);
router.patch("/updatefavorite/:favorite_uuid", protect, isClient, updateFavoriteRestaurantValidator, validate, updateFavoriteRestaurant);

export default router;
