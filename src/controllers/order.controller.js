import * as orderService from "../services/order.service.js";
import { createOrderWithItems, getOrdersByRestaurant } from "../services/orderWithItem.js";

// ==================== ORDER CRUD ====================
// src/controllers/order.controller.js

// ✅ Create order with items - client_id from JWT
export const createOrder = async (req, res, next) => {
  try {
    // ✅ Get client_id from JWT token
    const client_id = req.user.client_id;
    
    if (!client_id) {
      return res.status(400).json({
        success: false,
        message: "Client profile not found in token"
      });
    }

    // Merge client_id with request body
    const orderData = {
      ...req.body,
      client_id // Override any client_id in body with authenticated user's ID
    };

    const order = await createOrderWithItems(orderData);
    
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
      if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client profile not found"
      });
    }
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
        const { preparation_time } = req.body; // restaurant provides this

    
    const order = await orderService.acceptOrder(id, userId, { preparation_time });
    
    res.json({
      success: true,
      message: `Order accepted with ${preparation_time || 15} minutes preparation time`,
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


// Start preparing order → Notifies nearby drivers
export const startPreparingOrder = async (req, res, next) => {
  try {
    const order = await orderService.startPreparing(req.params.id);
    res.json({
      message: 'Order is now being prepared',
      order
    });
  } catch (error) {
    next(error);
  }
};


// Get orders by restaurant ID
export const getRestaurantOrders = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const filters = {
      status: req.query.status,
      order_type: req.query.order_type
    };
    
    const orders = await getOrdersByRestaurant(restaurant_id, filters);
    
    res.json({
      message: 'Orders retrieved successfully',
      data: orders,
      count: orders.length
    });
  } catch (error) {
    next(error);
  }
};



// ==================== CONTROLLER ====================
// Add this to order.controller.js

/**
 * Get nearby orders for authenticated driver
 * GET /api/orders/nearby
 */
export const getNearbyOrders = async (req, res, next) => {
  try {
    // Get driver ID from authenticated user
    const driverId = req.user?.driver_id || req.user?.id;
    
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Driver authentication required"
      });
    }

    const result = await orderService.getNearbyOrders(driverId, req.query);
    
    res.json({
      success: true,
      message: `Found ${result.orders.length} nearby orders`,
      data: result.orders,
      pagination: result.pagination,
      driver_location: result.driver_location,
      search_radius_km: result.search_radius_km
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