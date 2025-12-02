// src/routes/foodCategory.route.js
import { Router } from "express";
import { 
  createFoodCategoryValidator, 
  updateFoodCategoryValidator, 
  deleteFoodCategoryValidator,
  getMyRestaurantCategoriesValidator,
  getRestaurantCategoriesValidator 
} from "../validators/foodCategoryValidator.js";
import { validate } from "../middlewares/validate.js";
import * as foodCategoryCtrl from "../controllers/foodCategory.controller.js";
import { protect, isRestaurant, authorize } from "../middlewares/auth.js";

const router = Router();

// ==================== ROUTES PROTÉGÉES - RESTAURANT ====================

// ✅ Create - restaurant crée une catégorie pour lui-même
router.post(
  "/", 
  protect, 
  isRestaurant, 
  createFoodCategoryValidator, 
  validate, 
  foodCategoryCtrl.create
);

// ✅ Get MY categories - restaurant récupère SES catégories (avec pagination)
router.get(
  "/me", 
  protect, 
  isRestaurant, 
  getMyRestaurantCategoriesValidator,
  validate,
  foodCategoryCtrl.getMyCategories
);

// ✅ Update - restaurant met à jour SA catégorie
router.put(
  "/:id", 
  protect, 
  isRestaurant,
  updateFoodCategoryValidator, 
  validate, 
  foodCategoryCtrl.update
);

// ✅ Delete - restaurant supprime SA catégorie
router.delete(
  "/:id", 
  protect, 
  isRestaurant,
  deleteFoodCategoryValidator, 
  validate, 
  foodCategoryCtrl.remove
);

// ==================== ROUTES PUBLIQUES / ADMIN ====================

// Get all categories (public ou admin)
router.get("/", foodCategoryCtrl.getAll);

// Get categories by restaurant ID (pour admin ou public)
router.get(
  "/restaurant/:restaurantId", 
  getRestaurantCategoriesValidator, 
  validate, 
  foodCategoryCtrl.getByRestaurant
);

export default router;