// src/routes/restaurant.route.js
import { Router } from "express";
import { protect, isClient, isRestaurant, authorize } from "../middlewares/auth.js";
import * as restaurantCtrl from "../controllers/restaurant.controller.js";
import { 
  createRestaurantValidator, 
  nearbyRestaurantValidator, 
  deleteRestaurantValidator, 
  updateRestaurantValidator, 
  nearbyFilterValidator 
} from "../validators/restaurantValidator.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

// Public routes (no auth needed for browsing basic info)
router.get("/getall", restaurantCtrl.getAll);

// Protected routes - require client authentication
router.post("/nearbyfilter", protect, isClient, nearbyFilterValidator, validate, restaurantCtrl.nearbyFilter);
router.post("/getnearbynames", protect, isClient, nearbyFilterValidator, validate, restaurantCtrl.getNearbyNames);
router.get('/details/:restaurantId', protect, isClient, restaurantCtrl.getRestaurantMenu);

// Restaurant management routes
router.put("/profile", protect, isRestaurant, updateRestaurantValidator, validate, restaurantCtrl.updateProfile);
router.put("/update/:id", protect, authorize('admin'), updateRestaurantValidator, validate, restaurantCtrl.update);
router.delete("/delete/:id", protect, authorize('admin', 'restaurant'), deleteRestaurantValidator, validate, restaurantCtrl.remove);

export default router;