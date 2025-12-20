import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { protect, isRestaurant, isAdmin } from "../middlewares/auth.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";
import * as additionCtrl from "../controllers/addition.controller.js";
import {
  createAdditionValidator,
  updateAdditionValidator,
  deleteAdditionValidator,
  getAdditionsByMenuItemValidator
} from "../validators/additionValidator.js";
import { body, query } from "express-validator";

const router = Router();

const requireRestaurantIdBody = body("restaurant_id")
  .notEmpty()
  .withMessage("restaurant_id is required")
  .isUUID()
  .withMessage("restaurant_id must be a valid UUID");

const requireRestaurantIdQuery = query("restaurant_id")
  .notEmpty()
  .withMessage("restaurant_id is required")
  .isUUID()
  .withMessage("restaurant_id must be a valid UUID");

const adminCreateAdditionValidator = [
  ...createAdditionValidator,
  requireRestaurantIdBody
];

const adminUpdateAdditionValidator = [
  ...updateAdditionValidator,
  requireRestaurantIdBody
];

const adminDeleteAdditionValidator = [
  ...deleteAdditionValidator,
  requireRestaurantIdBody
];

const adminGetAdditionsByMenuItemValidator = [
  ...getAdditionsByMenuItemValidator,
  requireRestaurantIdQuery
];

router.post(
  "/create",
  protect,
  isRestaurant,
  createAdditionValidator,
  validate,
  additionCtrl.create
);

router.put(
  "/update/:id",
  protect,
  isRestaurant,
  updateAdditionValidator,
  validate,
  additionCtrl.update
);

router.delete(
  "/delete/:id",
  protect,
  isRestaurant,
  deleteAdditionValidator,
  validate,
  additionCtrl.remove
);

router.get(
  "/by-menu-item/:menu_item_id",
  protect,
  isRestaurant,
  getAdditionsByMenuItemValidator,
  validate,
  cacheMiddleware({ ttl: 60 }),
  additionCtrl.getByMenuItem
);

router.post(
  "/admin/create",
  protect,
  isAdmin,
  adminCreateAdditionValidator,
  validate,
  additionCtrl.create
);

router.put(
  "/admin/update/:id",
  protect,
  isAdmin,
  adminUpdateAdditionValidator,
  validate,
  additionCtrl.update
);

router.delete(
  "/admin/delete/:id",
  protect,
  isAdmin,
  adminDeleteAdditionValidator,
  validate,
  additionCtrl.remove
);

router.get(
  "/admin/by-menu-item/:menu_item_id",
  protect,
  isAdmin,
  adminGetAdditionsByMenuItemValidator,
  validate,
  cacheMiddleware({ ttl: 60 }),
  additionCtrl.getByMenuItem
);

export default router;
