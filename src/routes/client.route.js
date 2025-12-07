import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { protect, isClient, authorize } from "../middlewares/auth.js";
import * as clientCtrl from "../controllers/client.controller.js";
import {
  updateClientValidator,
  deleteClientValidator,
  getAllClientsValidator, 
  getMyOrdersValidator,
  favoriteAddressCreateValidator,
  favoriteAddressUpdateValidator,
  favoriteAddressIdValidator
} from "../validators/clientValidator.js";
const router = Router();


// ✅ Protected routes - client's own profile
router.get("/profile/me", protect, isClient, clientCtrl.getProfile);
router.put("/profile", protect, isClient, updateClientValidator, validate, clientCtrl.updateProfile);

router.get(
  "/orders", 
  protect, 
  isClient, 
  getMyOrdersValidator, 
  validate, 
  clientCtrl.getMyOrders
);

// Favorite addresses
router.get("/favorite-addresses", protect, isClient, clientCtrl.listFavoriteAddresses);
router.post("/favorite-addresses", protect, isClient, favoriteAddressCreateValidator, validate, clientCtrl.createFavoriteAddress);
router.put("/favorite-addresses/:id", protect, isClient, favoriteAddressIdValidator, favoriteAddressUpdateValidator, validate, clientCtrl.updateFavoriteAddress);
router.delete("/favorite-addresses/:id", protect, isClient, favoriteAddressIdValidator, validate, clientCtrl.deleteFavoriteAddress);

// Admin routes
router.get("/getall", protect, authorize('admin'), getAllClientsValidator, validate, clientCtrl.getAll);
router.put("/update/:id", protect, authorize('admin'), updateClientValidator, validate, clientCtrl.update);
router.delete("/delete/:id", protect, authorize('admin', 'client'), deleteClientValidator, validate, clientCtrl.remove);

export default router;
