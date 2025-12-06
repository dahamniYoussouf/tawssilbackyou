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
  menuItemCtrl.getMyMenuItems
);

router.get(
  "/cashier/menu",
  protect,
  isCashier,
  getMyMenuItemsValidator,
  validate,
  menuItemCtrl.getCashierMenuItems
);

// ✅ Get MY statistics - statistiques des items du restaurant
router.get(
  "/me/statistics",
  protect,
  isRestaurant,
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

// ==================== ROUTES PUBLIQUES / CLIENT ====================

// Get all menu items (admin)
router.get(
  "/getall",
  protect,
  authorize('admin'),
  getAllMenuItemsValidator,
  validate,
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
  menuItemCtrl.getById
);

export default router;