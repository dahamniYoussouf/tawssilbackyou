import { Router } from "express";
import { 
  createFoodCategoryValidator, 
  updateFoodCategoryValidator, 
  deleteFoodCategoryValidator,
  getFoodCategoryValidator,
  getRestaurantCategoriesValidator 
} from "../validators/foodCategoryValidator.js";
import { validate } from "../middlewares/validate.js";
import * as foodCategoryCtrl from "../controllers/foodCategory.controller.js";
import { protect, isRestaurant } from "../middlewares/auth.js"; // ✅ import


const router = Router();

// Create a new food category
router.post("/", protect, isRestaurant, createFoodCategoryValidator, validate, foodCategoryCtrl.create);

// Get all food categories
router.get("/", foodCategoryCtrl.getAll);

// Get all categories for a specific restaurant
router.get("/restaurant/:restaurantId", getRestaurantCategoriesValidator, validate, foodCategoryCtrl.getByRestaurant);

// Update a food category
router.put("/:id", updateFoodCategoryValidator, validate, foodCategoryCtrl.update);

// Delete a food category
router.delete("/:id", deleteFoodCategoryValidator, validate, foodCategoryCtrl.remove);

export default router;