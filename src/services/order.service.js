import { Op } from "sequelize";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import Driver from "../models/Driver.js";
import { updateDriverLocation as updateDriverLocationService } from "./driver.service.js";

// ==================== STATUS TRANSITIONS ====================

/**
 * PENDING -> ACCEPTED
 * Restaurant accepts the order
 */
export async function acceptOrder(orderId, userId) {
  const order = await Order.findByPk(orderId);
  if (!order) throw { status: 404, message: "Order not found" };
  
  if (!order.canTransitionTo('accepted')) {
    throw { status: 400, message: `Cannot accept order in ${order.status} status` };
  }
  
  await order.update({ status: 'accepted' });
  
  // Auto-transition to preparing after 1 minute
  setTimeout(async () => {
    await startPreparing(orderId);
  }, 60000); // 1 minute
  
  return order;
}

/**
 * ACCEPTED -> PREPARING (auto after 1 min)
 */
export async function startPreparing(orderId) {
  const order = await Order.findByPk(orderId);
  if (!order) return;
  
  if (order.status === 'accepted') {
    await order.update({ status: 'preparing' });
  }
}

/**
 * PREPARING -> ASSIGNED (for delivery) or DELIVERED (for pickup)
 * Driver accepts delivery OR customer picks up
 * Auto-assigns the NEAREST available driver (within radius)
 */
export async function assignDriverOrComplete(orderId, driverId = null) {
  const order = await Order.findByPk(orderId);
  if (!order) throw { status: 404, message: "Order not found" };
  
  if (order.status !== 'preparing') {
    throw { status: 400, message: "Order must be in preparing status" };
  }
  
  // PICKUP orders go directly to delivered
  if (order.order_type === 'pickup') {
    await order.update({ status: 'delivered' });
    return order;
  }
  
  // DELIVERY orders need a driver
  if (!driverId) {
    // AUTO-ASSIGN: Find nearest available driver
    const deliveryCoords = order.delivery_location?.coordinates;
    
    if (!deliveryCoords) {
      throw { status: 400, message: "Order has no delivery coordinates" };
    }
    
    const [longitude, latitude] = deliveryCoords;
    const searchRadius = 10000; // 10km radius in meters
    
    // Query drivers within radius, ordered by distance
    const drivers = await Driver.findAll({
      where: {
        status: 'available',
        is_active: true,
        is_verified: true,
        active_order_id: null,
        current_location: {
          [Op.ne]: null
        }
      },
      attributes: {
        include: [
          [
            sequelize.fn(
              'ST_Distance',
              sequelize.col('current_location'),
              sequelize.fn('ST_SetSRID', 
                sequelize.fn('ST_MakePoint', longitude, latitude),
                4326
              )
            ),
            'distance'
          ]
        ]
      },
      having: sequelize.literal(`ST_Distance(current_location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)) <= ${searchRadius}`),
      order: [
        [sequelize.literal('distance'), 'ASC'], // Nearest first
        ['rating', 'DESC'] // Then by rating
      ],
      limit: 1
    });
    
    if (drivers.length === 0) {
      throw { 
        status: 404, 
        message: `No available drivers found within ${searchRadius/1000}km radius` 
      };
    }
    
    const driver = drivers[0];
    driverId = driver.id;
    
    console.log(`🚗 Auto-assigned driver ${driver.driver_code} (${driver.getDataValue('distance')}m away, rating: ${driver.rating})`);
    
  } else {
    // MANUAL ASSIGNMENT: Validate driver
    const driver = await Driver.findByPk(driverId);
    if (!driver || !driver.isAvailable()) {
      throw { status: 400, message: "Driver is not available" };
    }
  }
  
  // Assign driver and update status
  await order.update({
    status: 'assigned',
    livreur_id: driverId
  });
  
  // Update driver status
  await Driver.update(
    { status: 'busy', active_order_id: orderId },
    { where: { id: driverId } }
  );
  
  return order;
}

/**
 * ASSIGNED -> DELIVERING
 * Driver clicks "Start Delivery" and begins sending GPS updates
 */
export async function startDelivering(orderId) {
  const order = await Order.findByPk(orderId);
  if (!order) throw { status: 404, message: "Order not found" };
  
  if (!order.canTransitionTo('delivering')) {
    throw { status: 400, message: `Cannot start delivery from ${order.status} status` };
  }
  
  await order.update({ status: 'delivering' });
  return order;
}

/**
 * Update driver GPS location (every 25s)
 * Updates driver.current_location - no need to store on order!
 */
export async function updateDriverGPS(driverId, longitude, latitude) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw { status: 404, message: "Driver not found" };
  
  // Check if driver has an active delivery
  if (!driver.active_order_id || driver.status !== 'busy') {
    throw { status: 400, message: "Driver has no active delivery" };
  }
  
  // Update driver's current location (single source of truth)
  await updateDriverLocationService(driverId, longitude, latitude);
  
  return {
    driver_id: driverId,
    order_id: driver.active_order_id,
    location: { longitude, latitude },
    updated_at: new Date()
  };
}

/**
 * DELIVERING -> DELIVERED
 * Driver confirms delivery
 */
export async function completeDelivery(orderId) {
  const order = await Order.findByPk(orderId);
  if (!order) throw { status: 404, message: "Order not found" };
  
  if (!order.canTransitionTo('delivered')) {
    throw { status: 400, message: `Cannot complete from ${order.status} status` };
  }
  
  await order.update({ status: 'delivered' });
  
  // Free up the driver
  if (order.livreur_id) {
    const driver = await Driver.findByPk(order.livreur_id);
    if (driver) {
      driver.active_order_id = null;
      driver.status = 'available';
      driver.total_deliveries += 1;
      await driver.save();
    }
  }
  
  return order;
}

/**
 * PENDING/ACCEPTED -> DECLINED
 * Restaurant declines the order
 */
export async function declineOrder(orderId, reason) {
  const order = await Order.findByPk(orderId);
  if (!order) throw { status: 404, message: "Order not found" };
  
  if (!order.canTransitionTo('declined')) {
    throw { status: 400, message: `Cannot decline order in ${order.status} status` };
  }
  
  await order.update({
    status: 'declined',
    decline_reason: reason
  });
  
  return order;
}

// ==================== CRUD OPERATIONS ====================

/**
 * CREATE ORDER (Client validates)
 */
export async function createOrderService(data) {
  const {
    client_id,
    restaurant_id,
    order_type = 'delivery',
    delivery_address,
    lat,
    lng,
    delivery_fee = 0,
    subtotal,
    payment_method,
    delivery_instructions,
    estimated_delivery_time
  } = data;

  const restaurant = await Restaurant.findByPk(restaurant_id);
  if (!restaurant) throw { status: 404, message: "Restaurant not found" };

  const client = await Client.findByPk(client_id);
  if (!client) throw { status: 404, message: "Client not found" };

  if (order_type === 'delivery' && !delivery_address) {
    throw { status: 400, message: "Delivery address required" };
  }

  const order = await Order.create({
    client_id,
    restaurant_id,
    order_type,
    delivery_address: order_type === 'delivery' ? delivery_address : null,
    delivery_fee: order_type === 'delivery' ? delivery_fee : 0,
    subtotal,
    payment_method,
    delivery_instructions,
    estimated_delivery_time,
    status: 'pending' // Always starts as pending
  });

  if (order_type === 'delivery' && lat && lng) {
    order.setDeliveryCoordinates(parseFloat(lng), parseFloat(lat));
  }

  order.calculateTotal();
  await order.save();

  return order;
}

/**
 * GET ALL ORDERS
 */
export async function getAllOrdersService(filters = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    order_type,
    client_id,
    restaurant_id,
    date_from,
    date_to,
    search
  } = filters;

  const offset = (page - 1) * limit;
  const where = {};

  if (status) where.status = status;
  if (order_type) where.order_type = order_type;
  if (client_id) where.client_id = client_id;
  if (restaurant_id) where.restaurant_id = restaurant_id;
  if (search) where.order_number = { [Op.iLike]: `%${search}%` };

  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at[Op.gte] = new Date(date_from);
    if (date_to) where.created_at[Op.lte] = new Date(date_to);
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'image_url']
      },
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: Driver,
        as: 'driver',
        attributes: ['id', 'first_name', 'last_name', 'phone', 'current_location']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: +limit,
    offset: +offset
  });

  return {
    orders: rows,
    pagination: {
      current_page: +page,
      total_pages: Math.ceil(count / limit),
      total_items: count
    }
  };
}

/**
 * GET ORDER BY ID (with real-time driver tracking)
 */
export async function getOrderByIdService(id) {
  const order = await Order.findByPk(id, {
    include: [
      { model: Restaurant, as: 'restaurant' },
      { model: Client, as: 'client' },
      {
        model: OrderItem,
        as: 'order_items',
        include: [{ model: MenuItem, as: 'menu_item' }]
      },
      {
        model: Driver,
        as: 'driver',
        attributes: ['id', 'first_name', 'last_name', 'phone', 'vehicle_type', 'rating', 'current_location']
      }
    ]
  });

  if (!order) throw { status: 404, message: "Order not found" };
  
  // Add real-time tracking info for active deliveries
  const result = order.toJSON();
  
  if (order.status === 'delivering' && order.driver) {
    result.tracking = {
      driver_location: order.driver.getCurrentCoordinates(),
      delivery_destination: order.delivery_location?.coordinates 
        ? { longitude: order.delivery_location.coordinates[0], latitude: order.delivery_location.coordinates[1] }
        : null,
      time_in_transit: order.getTimeInStatus(),
      estimated_arrival: order.estimated_delivery_time
    };
  }
  
  return result;
}

/**
 * GET REAL-TIME TRACKING FOR CLIENT
 * Shows live driver position on map
 */
export async function getOrderTracking(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [
      {
        model: Driver,
        as: 'driver',
        attributes: ['id', 'first_name', 'last_name', 'phone', 'vehicle_type', 'vehicle_plate', 'rating', 'current_location']
      }
    ]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  
  if (order.status !== 'delivering') {
    return {
      order_id: orderId,
      status: order.status,
      message: "Order is not currently in delivery"
    };
  }
  
  const driverCoords = order.driver?.getCurrentCoordinates();
  const destinationCoords = order.delivery_location?.coordinates 
    ? { longitude: order.delivery_location.coordinates[0], latitude: order.delivery_location.coordinates[1] }
    : null;
  
  return {
    order_id: orderId,
    order_number: order.order_number,
    status: order.status,
    driver: {
      id: order.driver.id,
      name: order.driver.getFullName(),
      phone: order.driver.phone,
      vehicle_type: order.driver.vehicle_type,
      vehicle_plate: order.driver.vehicle_plate,
      rating: order.driver.rating,
      current_location: driverCoords
    },
    destination: destinationCoords,
    estimated_arrival: order.estimated_delivery_time,
    time_in_transit: order.getTimeInStatus()
  };
}

/**
 * ADD RATING (only for delivered orders)
 */
export async function addRatingService(id, rating, review_comment) {
  const order = await Order.findByPk(id);
  if (!order) throw { status: 404, message: "Order not found" };

  if (!order.canBeRated()) {
    throw {
      status: 400,
      message: "Order must be delivered and not already rated"
    };
  }

  await order.update({ rating, review_comment });

  // Update restaurant rating
  const restaurant = await Restaurant.findByPk(order.restaurant_id);
  if (restaurant) {
    const orders = await Order.findAll({
      where: {
        restaurant_id: order.restaurant_id,
        rating: { [Op.not]: null }
      }
    });

    const avgRating = orders.reduce((sum, o) => sum + parseFloat(o.rating), 0) / orders.length;
    await restaurant.update({ rating: avgRating.toFixed(1) });
  }

  return order;
}

/**
 * GET CLIENT ORDERS
 */
export async function getClientOrdersService(clientId, filters = {}) {
  const { page = 1, limit = 10, status } = filters;
  const offset = (page - 1) * limit;
  const where = { client_id: clientId };

  if (status) where.status = status;

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'image_url', 'rating']
      },
      {
        model: Driver,
        as: 'driver',
        attributes: ['id', 'first_name', 'last_name', 'phone']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: +limit,
    offset: +offset
  });

  return {
    orders: rows,
    pagination: {
      current_page: +page,
      total_pages: Math.ceil(count / limit),
      total_items: count
    }
  };
}