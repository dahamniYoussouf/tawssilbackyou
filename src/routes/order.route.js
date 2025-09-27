import { Router } from "express";
import { createOrderValidator, getAllOrdersValidator, getOrderByIdValidator, updateOrderValidator, deleteOrderValidator, updateOrderStatusValidator, updatePaymentStatusValidator, assignDeliveryPersonValidator, addRatingValidator, getOrderStatisticsValidator, getClientOrdersValidator } from "../validators/orderValidator.js";
import { validate } from "../middlewares/validate.js";
import * as orderController from "../controllers/order.controller.js";

const router = Router();

router.post('/create', createOrderValidator, validate, orderController.createOrder);
router.get('/getall', getAllOrdersValidator, validate, orderController.getAllOrders);
router.get('/statistics/overview', getOrderStatisticsValidator, validate, orderController.getOrderStatistics);
router.get('/client/:clientId', getClientOrdersValidator, validate, orderController.getClientOrders);
router.get('/:id', getOrderByIdValidator, validate, orderController.getOrderById);
router.put('/:id', updateOrderValidator, validate, orderController.updateOrder);
router.delete('/:id', deleteOrderValidator, validate, orderController.deleteOrder);
router.patch('/:id/status', updateOrderStatusValidator, validate, orderController.updateOrderStatus);
router.patch('/:id/payment', updatePaymentStatusValidator, validate, orderController.updatePaymentStatus);
router.patch('/:id/assign-delivery', assignDeliveryPersonValidator, validate, orderController.assignDeliveryPerson);
router.post('/:id/rating', addRatingValidator, validate, orderController.addRating);

export default router;
