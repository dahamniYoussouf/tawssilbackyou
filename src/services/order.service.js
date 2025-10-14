import { Op } from "sequelize";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import Driver from "../models/Driver.js";
import { updateDriverLocation as updateDriverLocationService } from "./driver.service.js";
import { emit, notifyNearbyDrivers } from "../config/socket.js";

// Helper to notify
function notify(type, id, data) {
  emit(`${type}:${id}`, "notification", data);
}

// ==================== STATUS TRANSITIONS ====================

export async function acceptOrder(orderId, userId) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: 'client' }, { model: Restaurant, as: 'restaurant' }]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo('accepted')) {
    throw { status: 400, message: `Cannot accept order in ${order.status} status` };
  }
  
  await order.update({ status: 'accepted' });
  
  // Notify client
  notify('client', order.client_id, {
    type: 'order_accepted',
    orderId: order.id,
    message: `${order.restaurant.name} accepted your order`
  });
  
  setTimeout(() => startPreparing(orderId), 60000);
  return order;
}

export async function startPreparing(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: 'client' }, { model: Restaurant, as: 'restaurant' }]
  });
  
  if (!order || order.status !== 'accepted') return;
  
  await order.update({ status: 'preparing' });
  
  // Notify client
  notify('client', order.client_id, {
    type: 'order_preparing',
    orderId: order.id,
    message: 'Your order is being prepared'
  });
  
  // Notify NEARBY drivers only (delivery only)
  if (order.order_type === 'delivery') {
    const coords = order.delivery_location?.coordinates;
    
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      
      notifyNearbyDrivers(lat, lng, {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurant: order.restaurant.name,
        restaurantAddress: order.restaurant.address,
        deliveryAddress: order.delivery_address,
        fee: order.delivery_fee,
        estimatedTime: order.estimated_delivery_time
      }, 10); // 10km radius
    }
  }
}

export async function assignDriverOrComplete(orderId, driverId = null) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: 'client' }, { model: Restaurant, as: 'restaurant' }]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (order.status !== 'preparing') {
    throw { status: 400, message: "Order must be in preparing status" };
  }
  
  // PICKUP
  if (order.order_type === 'pickup') {
    await order.update({ status: 'delivered' });
    notify('client', order.client_id, {
      type: 'order_ready',
      orderId: order.id,
      message: 'Order ready for pickup!'
    });
    return order;
  }
  
  // Check if already assigned
  if (order.livreur_id) {
    throw { status: 400, message: "Order already assigned" };
  }
  
  const driver = await Driver.findByPk(driverId);
  if (!driver || !driver.isAvailable()) {
    throw { status: 400, message: "Driver not available" };
  }
  
  await order.update({ status: 'assigned', livreur_id: driverId });
  await Driver.update({ status: 'busy', active_order_id: orderId }, { where: { id: driverId } });
  
  // Notify client
  notify('client', order.client_id, {
    type: 'driver_assigned',
    orderId: order.id,
    driver: driver.getFullName(),
    phone: driver.phone
  });
  
  // Notify driver
  notify('driver', driverId, {
    type: 'order_confirmed',
    orderId: order.id,
    message: 'Order assigned to you'
  });
  
  return order;
}

export async function startDelivering(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: 'client' }, { model: Driver, as: 'driver' }]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo('delivering')) {
    throw { status: 400, message: `Cannot start delivery from ${order.status} status` };
  }
  
  await order.update({ status: 'delivering' });
  
  notify('client', order.client_id, {
    type: 'delivery_started',
    orderId: order.id,
    message: 'Your order is on the way!'
  });
  
  return order;
}

export async function updateDriverGPS(driverId, longitude, latitude) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw { status: 404, message: "Driver not found" };
  if (!driver.active_order_id) {
    throw { status: 400, message: "No active delivery" };
  }
  
  await updateDriverLocationService(driverId, longitude, latitude);
  
  // Broadcast to order room
  emit(`order:${driver.active_order_id}`, 'location', { lat: latitude, lng: longitude });
  
  return { driver_id: driverId, order_id: driver.active_order_id };
}

export async function completeDelivery(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: 'client' }, { model: Driver, as: 'driver' }]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo('delivered')) {
    throw { status: 400, message: `Cannot complete from ${order.status} status` };
  }
  
  await order.update({ status: 'delivered' });
  
  if (order.livreur_id) {
    const driver = await Driver.findByPk(order.livreur_id);
    if (driver) {
      driver.active_order_id = null;
      driver.status = 'available';
      driver.total_deliveries += 1;
      await driver.save();
    }
  }
  
  notify('client', order.client_id, {
    type: 'order_delivered',
    orderId: order.id,
    message: 'Order delivered!'
  });
  
  if (order.driver) {
    notify('driver', order.driver.id, {
      type: 'delivery_complete',
      message: 'Delivery completed'
    });
  }
  
  return order;
}

export async function declineOrder(orderId, reason) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: 'client' }]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo('declined')) {
    throw { status: 400, message: `Cannot decline order in ${order.status} status` };
  }
  
  await order.update({ status: 'declined', decline_reason: reason });
  
  notify('client', order.client_id, {
    type: 'order_declined',
    orderId: order.id,
    reason: reason
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

  notify('restaurant', data.restaurant_id, {
    type: 'new_order',
    orderId: order.id,
    orderNumber: order.order_number,
    total: order.total
  });
  
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