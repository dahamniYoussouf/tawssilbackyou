// src/routes/restaurant.route.js
import { Router } from "express";
import { protect, isClient, isRestaurant, authorize, isAdmin } from "../middlewares/auth.js";
import * as restaurantCtrl from "../controllers/restaurant.controller.js";
import { 
  nearbyRestaurantValidator, 
  deleteRestaurantValidator, 
  updateRestaurantValidator, 
  nearbyFilterValidator , 
  getRestaurantStatisticsValidator
} from "../validators/restaurantValidator.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

// Public routes (no auth needed for browsing basic info)
router.get("/getall", restaurantCtrl.getAll);
// Add this line with other restaurant management routes
router.get("/profile/me", protect, isRestaurant, restaurantCtrl.getProfile);

// Protected routes - require client authentication
router.post("/nearbyfilter", protect, isClient, nearbyFilterValidator, validate, restaurantCtrl.nearbyFilter);
router.post("/filter", protect, isAdmin, restaurantCtrl.filter);
router.post("/getnearbynames", protect, isClient, nearbyFilterValidator, validate, restaurantCtrl.getNearbyNames);
router.get('/details/:restaurantId', protect, isClient, restaurantCtrl.getRestaurantMenu);

// Restaurant management routes
router.put("/profile", protect, isRestaurant, updateRestaurantValidator, validate, restaurantCtrl.updateProfile);
router.put("/update/:id", protect, authorize('admin'), updateRestaurantValidator, validate, restaurantCtrl.update);
router.delete("/delete/:id", protect, authorize('admin', 'restaurant'), deleteRestaurantValidator, validate, restaurantCtrl.remove);
router.get("/statistics/me", protect, isRestaurant, getRestaurantStatisticsValidator,  validate, restaurantCtrl.getRestaurantStatistics);
router.get(  "/:id/statistics", protect, authorize('admin'),  getRestaurantStatisticsValidator,  validate,  restaurantCtrl.getRestaurantStatistics);
export default router;