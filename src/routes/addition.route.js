import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { protect, isRestaurant } from "../middlewares/auth.js";
import * as additionCtrl from "../controllers/addition.controller.js";
import {
  createAdditionValidator,
  updateAdditionValidator,
  deleteAdditionValidator,
  getAdditionsByMenuItemValidator
} from "../validators/additionValidator.js";

const router = Router();

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
  additionCtrl.getByMenuItem
);

export default router;
