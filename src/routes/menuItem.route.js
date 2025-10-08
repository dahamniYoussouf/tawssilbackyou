import { Router } from "express";
import {
  createMenuItemValidator,
  updateMenuItemValidator,
  deleteMenuItemValidator,
  getMenuItemByIdValidator,
  getAllMenuItemsValidator,
  getByCategoryValidator,
  toggleAvailabilityValidator,
  bulkUpdateAvailabilityValidator
} from "../validators/menuItemValidator.js";
import { validate } from "../middlewares/validate.js";
import * as menuItemCtrl from "../controllers/menuItem.controller.js";

const router = Router();

// Create menu item
router.post(
  "/create",
  createMenuItemValidator,
  validate,
  menuItemCtrl.create
);

// Get all menu items with filters
router.get(
  "/getall",
  getAllMenuItemsValidator,
  validate,
  menuItemCtrl.getAll
);

// Get menu items by category (with favorites)
router.post(
  "/filter",
  getByCategoryValidator,
  validate,
  menuItemCtrl.getByCategory
);

// Get menu item by ID
router.get(
  "/:id",
  getMenuItemByIdValidator,
  validate,
  menuItemCtrl.getById
);

// Update menu item
router.put(
  "/update/:id",
  updateMenuItemValidator,
  validate,
  menuItemCtrl.update
);

// Toggle availability
router.patch(
  "/toggle-availability/:id",
  toggleAvailabilityValidator,
  validate,
  menuItemCtrl.toggleAvailability
);

// Bulk update availability
router.patch(
  "/bulk-availability",
  bulkUpdateAvailabilityValidator,
  validate,
  menuItemCtrl.bulkUpdateAvailability
);

// Delete menu item
router.delete(
  "/delete/:id",
  deleteMenuItemValidator,
  validate,
  menuItemCtrl.remove
);

export default router;