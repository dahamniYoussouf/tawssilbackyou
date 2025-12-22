import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { protect, authorize } from "../middlewares/auth.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";
import * as homeCategoryCtrl from "../controllers/homeCategory.controller.js";
import {
  createHomeCategoryValidator,
  updateHomeCategoryValidator,
  homeCategoryIdValidator,
  listHomeCategoriesValidator
} from "../validators/homeCategoryValidator.js";

const router = Router();

// ✅ Public routes
router.get(
  "/", 
  listHomeCategoriesValidator, 
  validate, 
  cacheMiddleware({ ttl: 300 }), 
  homeCategoryCtrl.getCategories
);

// ✅ Admin routes
router.post(
  "/", 
  protect, 
  authorize('admin'), 
  createHomeCategoryValidator, 
  validate, 
  homeCategoryCtrl.createCategory
);

router.put(
  "/:id", 
  protect, 
  authorize('admin'), 
  homeCategoryIdValidator, 
  updateHomeCategoryValidator, 
  validate, 
  homeCategoryCtrl.updateCategory
);

router.delete(
  "/:id", 
  protect, 
  authorize('admin'), 
  homeCategoryIdValidator, 
  validate, 
  homeCategoryCtrl.removeCategory
);

export default router;