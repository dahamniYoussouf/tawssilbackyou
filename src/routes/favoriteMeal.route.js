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
import { protect, isClient } from "../middlewares/auth.js";

const router = express.Router();

router.post("/create", protect, isClient, addFavoriteMealValidator, validate, addFavoriteMeal);
router.delete("/delete/:favorite_uuid", protect, isClient, removeFavoriteMealValidator, validate, removeFavoriteMeal);
router.get("/getclientfavorites", protect, isClient, getFavoriteMealsValidator, validate, getFavoriteMeals);
router.patch("/updatefavorite/:favorite_uuid", protect, isClient, updateFavoriteMealValidator, validate, updateFavoriteMeal);

export default router;
