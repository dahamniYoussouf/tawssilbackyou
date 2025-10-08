import express from "express";
import {
  addFavoriteMeal,
  removeFavoriteMeal,
  getFavoriteMeals,
  updateFavoriteMeal
} from "../controllers/favoriteMeal.controller.js";
import {
  addFavoriteMealValidator,
  removeFavoriteMealValidator,
  getFavoriteMealsValidator,
  updateFavoriteMealValidator
} from "../validators/favoriteMealValidator.js";
import { validate } from "../middlewares/validate.js";

const router = express.Router();

// ⭐ Add a meal to favorites
router.post(
  "/create",
  addFavoriteMealValidator,
  validate,
  addFavoriteMeal
);

// ❌ Remove a meal from favorites
router.delete(
  "/delete/:favorite_uuid",
  removeFavoriteMealValidator,
  validate,
  removeFavoriteMeal
);

// 📋 Get all favorite meals for a client
router.get(
  "/getclientfavorites",
  getFavoriteMealsValidator,
  validate,
  getFavoriteMeals
);

// 🔄 Update a favorite meal (customizations/notes)
router.patch(
  "/updatefavorite/:favorite_uuid",
  updateFavoriteMealValidator,
  validate,
  updateFavoriteMeal
);

export default router;