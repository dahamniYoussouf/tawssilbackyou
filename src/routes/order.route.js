import { Router } from "express";
import {
  createOrderValidator,
  getAllOrdersValidator,
  getOrderByIdValidator,
  addRatingValidator,
  getClientOrdersValidator,
  createOrderWithItemsValidator,
  declineOrderValidator,
  assignDriverValidator,
  updateDriverGPSValidator,
  driverCancelOrderValidator 
} from "../validators/orderValidator.js";
import { validate } from "../middlewares/validate.js";
import { protect, isClient, isRestaurant, isDriver } from "../middlewares/auth.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

// ==================== ORDER CRUD ====================

// Create order - only authenticated clients
router.post('/', protect, isClient, createOrderWithItemsValidator, validate, orderController.createOrder);
router.post('/create-from-pos', createOrderWithItemsValidator, validate, orderController.createOrderFromPOS);
router.post('/create', protect, isClient, createOrderValidator, validate, orderController.createOrder);

// Get all orders - protected (admin/restaurant use)
router.get('/', protect, getAllOrdersValidator, validate, orderController.getAllOrders);

// ==================== SPECIFIC ROUTES ====================

router.get('/nearby', protect, isDriver, orderController.getNearbyOrders);
router.get('/client/:clientId', protect, isClient, getClientOrdersValidator, validate, orderController.getClientOrders);
router.get('/restaurant/:restaurant_id/orders', protect, isRestaurant, orderController.getRestaurantOrders);
router.put('/drivers/:driverId/gps', protect, isDriver, updateDriverGPSValidator, validate, orderController.updateDriverGPS);

// ==================== ORDER BY ID & TRACKING ====================

router.get('/:id', protect, getOrderByIdValidator, validate, orderController.getOrderById);
router.get('/:id/tracking', protect, getOrderByIdValidator, validate, orderController.getOrderTracking);

// ==================== STATUS TRANSITIONS ====================

router.post('/:id/accept', protect, getOrderByIdValidator, validate, orderController.acceptOrder);
router.post('/:id/preparing', protect, isRestaurant, getOrderByIdValidator, validate, orderController.startPreparingOrder);
router.post('/:id/decline', protect, declineOrderValidator, validate, orderController.declineOrder);
router.post('/:id/assign-driver', protect, assignDriverValidator, validate, orderController.assignDriverOrComplete);
router.post('/:id/start-delivery', protect, isDriver, getOrderByIdValidator, validate, orderController.startDelivering);
router.post('/:id/arrived', protect, isDriver, getOrderByIdValidator, validate, orderController.driverArrived);
router.get('/:id/route-preview', protect, isDriver, getOrderByIdValidator, validate, orderController.getRoutePreview);
router.post('/:id/complete-delivery', protect, isDriver, getOrderByIdValidator, validate, orderController.completeDelivery);
router.post('/:id/driver-cancel', protect, isDriver, driverCancelOrderValidator,validate, orderController.driverCancelOrder);
// ==================== RATING ====================

router.post('/:id/rating', protect, isClient, addRatingValidator, validate, orderController.addRating);

export default router;