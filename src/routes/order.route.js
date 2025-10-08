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
  updateDriverGPSValidator
} from "../validators/orderValidator.js";
import { validate } from "../middlewares/validate.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

// ==================== ORDER CRUD ====================

// Create order with items (recommended)
router.post(
  '/',
  createOrderWithItemsValidator,
  validate,
  orderController.createOrder
);

// Legacy create order endpoint
router.post(
  '/create',
  createOrderValidator,
  validate,
  orderController.createOrder
);

// Get all orders with filters
router.get(
  '/',
  getAllOrdersValidator,
  validate,
  orderController.getAllOrders
);

// Get order by ID (with tracking info if delivering)
router.get(
  '/:id',
  getOrderByIdValidator,
  validate,
  orderController.getOrderById
);

// Get client orders
router.get(
  '/client/:clientId',
  getClientOrdersValidator,
  validate,
  orderController.getClientOrders
);

// ==================== STATUS TRANSITIONS ====================

// Restaurant accepts order (PENDING -> ACCEPTED)
router.post(
  '/:id/accept',
  getOrderByIdValidator,
  validate,
  orderController.acceptOrder
);

// Restaurant declines order (PENDING/ACCEPTED -> DECLINED)
router.post(
  '/:id/decline',
  declineOrderValidator,
  validate,
  orderController.declineOrder
);

// Assign driver or complete pickup (PREPARING -> ASSIGNED/DELIVERED)
router.post(
  '/:id/assign-driver',
  assignDriverValidator,
  validate,
  orderController.assignDriverOrComplete
);

// Driver starts delivery (ASSIGNED -> DELIVERING)
router.post(
  '/:id/start-delivery',
  getOrderByIdValidator,
  validate,
  orderController.startDelivering
);

// Driver completes delivery (DELIVERING -> DELIVERED)
router.post(
  '/:id/complete-delivery',
  getOrderByIdValidator,
  validate,
  orderController.completeDelivery
);

// ==================== GPS TRACKING ====================

// Update driver GPS location (every 25s during delivery)
router.put(
  '/drivers/:driverId/gps',
  updateDriverGPSValidator,
  validate,
  orderController.updateDriverGPS
);

// Get real-time order tracking (for client)
router.get(
  '/:id/tracking',
  getOrderByIdValidator,
  validate,
  orderController.getOrderTracking
);

// ==================== RATING ====================

// Add rating to delivered order
router.post(
  '/:id/rating',
  addRatingValidator,
  validate,
  orderController.addRating
);

export default router;