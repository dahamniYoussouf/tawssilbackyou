import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import * as orderItemCtrl from "../controllers/orderItem.controller.js";
import {
  createOrderItemValidator,
  updateOrderItemValidator,
  updateOrderItemStatusValidator,
  getOrderItemsByOrderValidator,
  orderItemByIdValidator,
  deleteOrderItemValidator
} from "../validators/orderItemValidator.js";

const router = Router();

// Create a new order item
router.post("/create", createOrderItemValidator, validate, orderItemCtrl.create);

// Update an order item
router.put("/update/:id", updateOrderItemValidator, validate, orderItemCtrl.update);

// Update order item status only
router.patch("/update-status/:id", updateOrderItemStatusValidator, validate, orderItemCtrl.updateStatus);

// Delete an order item
router.delete("/delete/:id", deleteOrderItemValidator, validate, orderItemCtrl.remove);

// Get all order items
router.get("/getall", orderItemCtrl.getAll);

// Get a single order item by ID
router.get("/:id", orderItemByIdValidator, validate, orderItemCtrl.getById);

// Get all order items for a specific order
router.get("/order/:order_id", getOrderItemsByOrderValidator, validate, orderItemCtrl.getByOrderId);

export default router;