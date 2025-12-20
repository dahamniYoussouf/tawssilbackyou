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
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

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
  cacheMiddleware({ ttl: 60 }),
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
router.get("/", cacheMiddleware({ ttl: 300 }), foodCategoryCtrl.getAll);

// ==================== ROUTES PROTA%GA%ES - ADMIN ====================
router.post(
  "/admin/restaurant/:restaurantId",
  protect,
  authorize('admin'),
  getRestaurantCategoriesValidator,
  createFoodCategoryValidator,
  validate,
  foodCategoryCtrl.adminCreateForRestaurant
);

router.put(
  "/admin/:id",
  protect,
  authorize('admin'),
  updateFoodCategoryValidator,
  validate,
  foodCategoryCtrl.adminUpdate
);

router.delete(
  "/admin/:id",
  protect,
  authorize('admin'),
  deleteFoodCategoryValidator,
  validate,
  foodCategoryCtrl.adminRemove
);

// Get categories by restaurant ID (pour admin ou public)
router.get(
  "/restaurant/:restaurantId", 
  getRestaurantCategoriesValidator, 
  validate, 
  cacheMiddleware({ ttl: 300 }),
  foodCategoryCtrl.getByRestaurant
);

export default router;
