// controllers/orderItem.controller.js
import * as orderItemService from "../services/orderItem.service.js";

/**
 * Create a single order item
 */
export const create = async (req, res, next) => {
  try {
    const orderItem = await orderItemService.createOrderItem(req.body);
    res.status(201).json({ success: true, data: orderItem });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk create order items (for new orders)
 */
export const bulkCreate = async (req, res, next) => {
  try {
    const { order_id, items } = req.body;
    const createdItems = await orderItemService.bulkCreateOrderItems(order_id, items);
    res.status(201).json({
      success: true,
      message: "Order items created successfully",
      data: createdItems
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all order items
 */
export const getAll = async (req, res, next) => {
  try {
    const items = await orderItemService.getAllOrderItems();
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

/**
 * Get order items by order ID
 */
export const getByOrderId = async (req, res, next) => {
  try {
    const items = await orderItemService.getOrderItemsByOrderId(req.params.order_id);
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single order item by ID
 */
export const getById = async (req, res, next) => {
  try {
    const item = await orderItemService.getOrderItemById(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an order item
 */
export const update = async (req, res, next) => {
  try {
    const item = await orderItemService.updateOrderItem(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Order item updated successfully",
      data: item
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an order item
 */
export const remove = async (req, res, next) => {
  try {
    await orderItemService.deleteOrderItem(req.params.id);
    res.status(200).json({
      success: true,
      message: "Order item deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};
