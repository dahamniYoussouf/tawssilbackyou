// src/routes/restaurant.route.js
import { Router } from "express";
import { protect, isClient, isRestaurant, authorize, isAdmin } from "../middlewares/auth.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";
import * as restaurantCtrl from "../controllers/restaurant.controller.js";
import { 
  nearbyRestaurantValidator, 
  deleteRestaurantValidator, 
  updateRestaurantValidator, 
  getRestaurantOrdersHistoryValidator,
  nearbyFilterValidator , 
  getRestaurantStatisticsValidator
} from "../validators/restaurantValidator.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

// Public routes (no auth needed for browsing basic info)
router.get("/getall", cacheMiddleware({ ttl: 300 }), restaurantCtrl.getAll);
router.post("/create", restaurantCtrl.createRestaurant);
// Add this line with other restaurant management routes
router.get("/profile/me", protect, isRestaurant, cacheMiddleware({ ttl: 60 }), restaurantCtrl.getProfile);

// Protected routes - require client authentication
router.post("/nearbyfilter", protect, isClient, nearbyFilterValidator, validate, restaurantCtrl.nearbyFilter);
router.post("/filter", protect, isAdmin, restaurantCtrl.filter);
router.post("/getnearbynames", protect, isClient, nearbyFilterValidator, validate, restaurantCtrl.getNearbyNames);
router.get("/details", protect, isRestaurant, cacheMiddleware({ ttl: 60 }), restaurantCtrl.getMyRestaurantMenu);
// Add this route with other restaurant management routes
router.get(
  "/orders/history", 
  protect, 
  isRestaurant, 
  getRestaurantOrdersHistoryValidator, 
  validate, 
  cacheMiddleware({ ttl: 30 }),
  restaurantCtrl.getOrdersHistory
);
router.get('/details/:restaurantId', protect, isClient, restaurantCtrl.getRestaurantMenu);
router.get('/admin/details/:restaurantId', protect, authorize('admin'), cacheMiddleware({ ttl: 60 }), restaurantCtrl.getRestaurantMenuAdmin);

// Restaurant management routes
router.put("/profile", protect, isRestaurant, updateRestaurantValidator, validate, restaurantCtrl.updateProfile);
router.put("/update/:id", protect, authorize('admin'), updateRestaurantValidator, validate, restaurantCtrl.update);
router.delete("/delete/:id", protect, authorize('admin', 'restaurant'), deleteRestaurantValidator, validate, restaurantCtrl.remove);
router.get("/statistics/me", protect, isRestaurant, getRestaurantStatisticsValidator,  validate, cacheMiddleware({ ttl: 30 }), restaurantCtrl.getRestaurantStatistics);
router.get(  "/:id/statistics", protect, authorize('admin'),  getRestaurantStatisticsValidator,  validate,  cacheMiddleware({ ttl: 30 }), restaurantCtrl.getRestaurantStatistics);
export default router;
