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
import { protect, isDriver } from "../middlewares/auth.js"; 
import * as orderController from "../controllers/order.controller.js";

const router = Router();

// ==================== ORDER CRUD ====================

router.post('/', createOrderWithItemsValidator, validate, orderController.createOrder);
router.post('/create', createOrderValidator, validate, orderController.createOrder);
router.get('/', getAllOrdersValidator, validate, orderController.getAllOrders);

// ==================== SPECIFIC ROUTES (BEFORE /:id) ====================

router.get('/nearby', protect, isDriver, orderController.getNearbyOrders);
router.get('/client/:clientId', getClientOrdersValidator, validate, orderController.getClientOrders);
router.get('/restaurant/:restaurant_id/orders', orderController.getRestaurantOrders);
router.put('/drivers/:driverId/gps', updateDriverGPSValidator, validate, orderController.updateDriverGPS);

// ==================== ORDER BY ID & TRACKING ====================

router.get('/:id', getOrderByIdValidator, validate, orderController.getOrderById);
router.get('/:id/tracking', getOrderByIdValidator, validate, orderController.getOrderTracking);

// ==================== STATUS TRANSITIONS ====================

router.post('/:id/accept', getOrderByIdValidator, validate, orderController.acceptOrder);
router.post('/:id/preparing', getOrderByIdValidator, validate, orderController.startPreparingOrder);
router.post('/:id/decline', declineOrderValidator, validate, orderController.declineOrder);
router.post('/:id/assign-driver', assignDriverValidator, validate, orderController.assignDriverOrComplete);
router.post('/:id/start-delivery', getOrderByIdValidator, validate, orderController.startDelivering);
router.post('/:id/complete-delivery', getOrderByIdValidator, validate, orderController.completeDelivery);

// ==================== RATING ====================

router.post('/:id/rating', addRatingValidator, validate, orderController.addRating);

export default router;