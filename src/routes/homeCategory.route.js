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
  homeCategoryCtrl.list
);

router.get(
  "/:id", 
  cacheMiddleware({ ttl: 300 }), 
  homeCategoryCtrl.getById
);

// ✅ Admin routes
router.post(
  "/", 
  protect, 
  authorize('admin'), 
  createHomeCategoryValidator, 
  validate, 
  homeCategoryCtrl.create
);

router.put(
  "/:id", 
  protect, 
  authorize('admin'), 
  homeCategoryIdValidator, 
  updateHomeCategoryValidator, 
  validate, 
  homeCategoryCtrl.update
);

router.delete(
  "/:id", 
  protect, 
  authorize('admin'), 
  homeCategoryIdValidator, 
  validate, 
  homeCategoryCtrl.remove
);

export default router;