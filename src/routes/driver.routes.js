// src/routes/driver.routes.js
import express from "express";
import { protect, isDriver, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  getAll,
  getById,
  update,
  remove,
  updateStatus,
  getStatistics, 
  getProfile, 
  updateProfile, 
  getActiveOrders
} from "../controllers/driver.controller.js";

import {
  getAllDriversValidator,
  getDriverByIdValidator,
  updateDriverValidator,
  deleteDriverValidator,
  updateStatusValidator
} from "../validators/driverValidator.js";

const router = express.Router();

// ===== PUBLIC/ADMIN ROUTES =====
router.get("/getall", protect, getAllDriversValidator, validate, getAll);

// ===== PROTECTED ROUTES - DRIVER'S OWN PROFILE =====
router.get("/profile/me", protect, isDriver, getProfile);
router.put("/profile", protect, isDriver, updateDriverValidator, validate, updateProfile);
router.patch("/status", protect, isDriver, updateStatusValidator, validate, updateStatus);
router.get("/statistics/me", protect, isDriver, getStatistics);

// Commandes actives du livreur
router.get('/active-orders', protect, isDriver, getActiveOrders);

// ===== ROUTES WITH :id PARAMETER (Must come after specific routes) =====
router.get("/:id", protect, getDriverByIdValidator, validate, getById);

// ===== ADMIN ROUTES =====
router.put("/update/:id", protect, authorize('admin'), updateDriverValidator, validate, update);
router.delete("/delete/:id", protect, authorize('admin', 'driver'), deleteDriverValidator, validate, remove);

export default router;