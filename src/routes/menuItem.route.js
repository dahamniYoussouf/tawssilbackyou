// src/routes/menuItem.route.js
import { Router } from "express";
import {
  createMenuItemValidator,
  updateMenuItemValidator,
  deleteMenuItemValidator,
  getMenuItemByIdValidator,
  getAllMenuItemsValidator,
  getByCategoryValidator,
  toggleAvailabilityValidator,
  bulkUpdateAvailabilityValidator,
  getMyMenuItemsValidator
} from "../validators/menuItemValidator.js";
import { validate } from "../middlewares/validate.js";
import * as menuItemCtrl from "../controllers/menuItem.controller.js";
import { protect, isRestaurant, isClient, authorize, isCashier  } from "../middlewares/auth.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = Router();

// ==================== ROUTES PROTÉGÉES - RESTAURANT ====================

// ✅ Create menu item - restaurant crée un item pour lui-même
router.post(
  "/create",
  protect,
  isRestaurant,
  createMenuItemValidator,
  validate,
  menuItemCtrl.create
);

// ✅ Get MY menu items - restaurant récupère SES items (avec pagination)
router.get(
  "/me",
  protect,
  isRestaurant,
  getMyMenuItemsValidator,
  validate,
  cacheMiddleware({ ttl: 60 }),
  menuItemCtrl.getMyMenuItems
);

router.get(
  "/cashier/menu",
  protect,
  isCashier,
  getMyMenuItemsValidator,
  validate,
  cacheMiddleware({ ttl: 30 }),
  menuItemCtrl.getCashierMenuItems
);

// ✅ Get MY statistics - statistiques des items du restaurant
router.get(
  "/me/statistics",
  protect,
  isRestaurant,
  cacheMiddleware({ ttl: 30 }),
  menuItemCtrl.getMyStatistics
);

// ✅ Toggle availability - restaurant toggle SON item
router.patch(
  "/toggle-availability/:id",
  protect,
  isRestaurant,
  toggleAvailabilityValidator,
  validate,
  menuItemCtrl.toggleAvailability
);

// ✅ Bulk update availability - restaurant met à jour SES items
router.patch(
  "/bulk-availability",
  protect,
  isRestaurant,
  bulkUpdateAvailabilityValidator,
  validate,
  menuItemCtrl.bulkUpdateAvailability
);

// ✅ Update menu item - restaurant met à jour SON item
router.put(
  "/update/:id",
  protect,
  isRestaurant,
  updateMenuItemValidator,
  validate,
  menuItemCtrl.update
);

// ✅ Delete menu item - restaurant supprime SON item
router.delete(
  "/delete/:id",
  protect,
  isRestaurant,
  deleteMenuItemValidator,
  validate,
  menuItemCtrl.remove
);

// ==================== ROUTES PROTA%GA%ES - ADMIN ====================
router.post(
  "/admin/create",
  protect,
  authorize('admin'),
  createMenuItemValidator,
  validate,
  menuItemCtrl.adminCreate
);

router.put(
  "/admin/update/:id",
  protect,
  authorize('admin'),
  updateMenuItemValidator,
  validate,
  menuItemCtrl.adminUpdate
);

router.delete(
  "/admin/delete/:id",
  protect,
  authorize('admin'),
  deleteMenuItemValidator,
  validate,
  menuItemCtrl.adminRemove
);

router.patch(
  "/admin/toggle-availability/:id",
  protect,
  authorize('admin'),
  toggleAvailabilityValidator,
  validate,
  menuItemCtrl.adminToggleAvailability
);

// ==================== ROUTES PUBLIQUES / CLIENT ====================

// Get all menu items (admin)
router.get(
  "/getall",
  protect,
  authorize('admin'),
  getAllMenuItemsValidator,
  validate,
  cacheMiddleware({ ttl: 60 }),
  menuItemCtrl.getAll
);

// Get menu items by category (with favorites) - pour clients
router.post(
  "/filter",
  protect,
  isClient,
  getByCategoryValidator,
  validate,
  menuItemCtrl.getByCategory
);

// Get menu item by ID (public) - DOIT ÊTRE EN DERNIER
router.get(
  "/:id",
  getMenuItemByIdValidator,
  validate,
  cacheMiddleware({ ttl: 300 }),
  menuItemCtrl.getById
);

export default router;
