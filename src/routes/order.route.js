import { Router } from "express";
import {
  createOrderValidator,
  getAllOrdersValidator,
  getOrderByIdValidator,
  addRestaurantRatingValidator,
  addDriverRatingValidator,
  getClientOrdersValidator,
  createOrderWithItemsValidator,
  declineOrderValidator,
  assignDriverValidator,
  updateDriverGPSValidator,
  driverCancelOrderValidator 
} from "../validators/orderValidator.js";
import { validate } from "../middlewares/validate.js";
import { protect, isClient, isRestaurant, isDriver, isCashier  } from "../middlewares/auth.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

// ==================== ORDER CRUD ====================

// Create order - only authenticated clients
router.post('/', protect, isClient, createOrderWithItemsValidator, validate, orderController.createOrder);
router.post('/create-from-pos',protect, isCashier, createOrderWithItemsValidator, validate, orderController.createOrderFromPOS);
router.post('/create', protect, isClient, createOrderValidator, validate, orderController.createOrder);

// Get all orders - protected (admin/restaurant use)
router.get('/', protect, getAllOrdersValidator, validate, cacheMiddleware({ ttl: 10 }), orderController.getAllOrders);

// ==================== SPECIFIC ROUTES ====================

router.get('/nearby', protect, isDriver, cacheMiddleware({ ttl: 5 }), orderController.getNearbyOrders);
router.get('/client/:clientId', protect, isClient, getClientOrdersValidator, validate, cacheMiddleware({ ttl: 10 }), orderController.getClientOrders);
router.get('/restaurant/:restaurant_id/orders', protect, isRestaurant, cacheMiddleware({ ttl: 10 }), orderController.getRestaurantOrders);
router.get('/cashier/history', protect, isCashier, cacheMiddleware({ ttl: 10 }), orderController.getCashierOrders);
router.put('/drivers/:driverId/gps', protect, isDriver, updateDriverGPSValidator, validate, orderController.updateDriverGPS);

// ==================== ORDER BY ID & TRACKING ====================

router.get('/:id', protect, getOrderByIdValidator, validate, cacheMiddleware({ ttl: 10 }), orderController.getOrderById);
router.get('/:id/tracking', protect, getOrderByIdValidator, validate, cacheMiddleware({ ttl: 5 }), orderController.getOrderTracking);

// ==================== STATUS TRANSITIONS ====================

router.post('/:id/accept', protect, getOrderByIdValidator, validate, orderController.acceptOrder);
router.post('/:id/preparing', protect, isRestaurant, getOrderByIdValidator, validate, orderController.startPreparingOrder);
router.post('/:id/decline', protect, declineOrderValidator, validate, orderController.declineOrder);
router.post('/:id/assign-driver', protect, assignDriverValidator, validate, orderController.assignDriverOrComplete);
router.post('/:id/start-delivery', protect, isDriver, getOrderByIdValidator, validate, orderController.startDelivering);
router.post('/:id/arrived', protect, isDriver, getOrderByIdValidator, validate, orderController.driverArrived);
router.get('/:id/route-preview', protect, isDriver, getOrderByIdValidator, validate, cacheMiddleware({ ttl: 30 }), orderController.getRoutePreview);
router.post('/:id/complete-delivery', protect, isDriver, getOrderByIdValidator, validate, orderController.completeDelivery);
router.post('/:id/driver-cancel', protect, isDriver, driverCancelOrderValidator,validate, orderController.driverCancelOrder);
// ==================== RATING ====================

router.post('/:id/restaurant-rating', protect, isClient, addRestaurantRatingValidator, validate, orderController.addRestaurantRating);
router.post('/:id/driver-rating', protect, isClient, addDriverRatingValidator, validate, orderController.addDriverRating);

export default router;
