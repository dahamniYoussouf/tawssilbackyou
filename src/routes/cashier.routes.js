// src/routes/cashier.routes.js
import express from "express";
import { protect, isCashier, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import * as cashierCtrl from "../controllers/cashier.controller.js";
import {
  updateCashierValidator,
  cashierStatusValidator
} from "../validators/cashierValidator.js";

const router = express.Router();

// ===== PROTECTED ROUTES - CASHIER'S OWN PROFILE =====
router.get("/profile/me", protect, isCashier, cashierCtrl.getProfile);
router.put("/profile", protect, isCashier, cashierCtrl.updateProfile);
router.patch("/status", protect, isCashier, cashierStatusValidator, validate, cashierCtrl.updateStatus);
router.get("/statistics/me", protect, isCashier, cashierCtrl.getStatistics);
router.get("/dashboard/today", protect, isCashier, cashierCtrl.getDashboardToday);

// ===== ADMIN/RESTAURANT ROUTES =====
router.get("/getall", protect, authorize('admin', 'restaurant'), cashierCtrl.getAll);
router.get("/:id", protect, authorize('admin', 'restaurant'), cashierCtrl.getById);
router.put(
  "/update/:id",
  protect,
  authorize('admin', 'restaurant'),
  updateCashierValidator,
  validate,
  cashierCtrl.update
);
router.delete("/delete/:id", protect, authorize('admin'), cashierCtrl.remove);

export default router;
