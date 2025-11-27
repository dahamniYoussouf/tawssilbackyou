import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { protect, isClient, authorize } from "../middlewares/auth.js";
import * as clientCtrl from "../controllers/client.controller.js";
import {
  updateClientValidator,
  deleteClientValidator,
  getAllClientsValidator
} from "../validators/clientValidator.js";
const router = Router();


// ✅ Protected routes - client's own profile
router.get("/profile/me", protect, isClient, clientCtrl.getProfile);
router.put("/profile", protect, isClient, updateClientValidator, validate, clientCtrl.updateProfile);

// Admin routes
router.get("/getall", protect, authorize('admin'), getAllClientsValidator, validate, clientCtrl.getAll);
router.put("/update/:id", protect, authorize('admin'), updateClientValidator, validate, clientCtrl.update);
router.delete("/delete/:id", protect, authorize('admin', 'client'), deleteClientValidator, validate, clientCtrl.remove);

export default router;