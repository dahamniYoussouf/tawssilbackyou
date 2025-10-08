import * as orderService from "../services/order.service.js";
import { createOrderWithItems } from "../services/orderWithItem.js";

// ==================== ORDER CRUD ====================

// Create order with items
export const createOrder = async (req, res, next) => {
  try {
    const order = await createOrderWithItems(req.body);
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order
    });
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Failed to create order",
      ...(process.env.NODE_ENV === 'development' && { error: err.stack })
    });
  }
};

// Get all orders with filters
export const getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrdersService(req.query);
    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

// Get order by ID
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderByIdService(id);
    
    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message || "Order not found"
      });
    }
    next(err);
  }
};

// Get client orders
export const getClientOrders = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const result = await orderService.getClientOrdersService(clientId, req.query);
    
    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

// ==================== STATUS TRANSITIONS ====================

// Restaurant accepts order (PENDING -> ACCEPTED)
export const acceptOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Restaurant user ID
    
    const order = await orderService.acceptOrder(id, userId);
    
    res.json({
      success: true,
      message: "Order accepted successfully",
      data: order
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

// Restaurant declines order (PENDING/ACCEPTED -> DECLINED)
export const declineOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Decline reason is required"
      });
    }
    
    const order = await orderService.declineOrder(id, reason);
    
    res.json({
      success: true,
      message: "Order declined",
      data: order
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

// Assign driver or complete pickup (PREPARING -> ASSIGNED/DELIVERED)
export const assignDriverOrComplete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body; // Optional - auto-assign if not provided
    
    const order = await orderService.assignDriverOrComplete(id, driver_id);
    
    const message = order.order_type === 'pickup' 
      ? "Pickup order completed" 
      : "Driver assigned successfully";
    
    res.json({
      success: true,
      message,
      data: order
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

// Driver starts delivery (ASSIGNED -> DELIVERING)
export const startDelivering = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const order = await orderService.startDelivering(id);
    
    res.json({
      success: true,
      message: "Delivery started",
      data: order
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

// Driver completes delivery (DELIVERING -> DELIVERED)
export const completeDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const order = await orderService.completeDelivery(id);
    
    res.json({
      success: true,
      message: "Delivery completed successfully",
      data: order
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

// ==================== DRIVER GPS TRACKING ====================

// Update driver GPS location (every 25s during delivery)
export const updateDriverGPS = async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const { longitude, latitude } = req.body;
    
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: "Longitude and latitude are required"
      });
    }
    
    const result = await orderService.updateDriverGPS(driverId, longitude, latitude);
    
    res.json({
      success: true,
      message: "GPS location updated",
      data: result
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

// Get real-time order tracking (for client)
export const getOrderTracking = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const tracking = await orderService.getOrderTracking(id);
    
    res.json({
      success: true,
      data: tracking
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

// ==================== RATING ====================

// Add rating (only for delivered orders)
export const addRating = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, review_comment } = req.body;
    
    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "Rating is required"
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }
    
    const order = await orderService.addRatingService(id, rating, review_comment);
    
    res.json({
      success: true,
      message: "Rating added successfully",
      data: order
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};