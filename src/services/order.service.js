import { Op, literal } from "sequelize";
import { sequelize } from "../config/database.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import Driver from "../models/Driver.js";
import { emit, notifyNearbyDrivers } from "../config/socket.js";
import calculateRouteTime from '../services/routingService.js'; 
import { sendWhatsAppMessage, templates } from './whatsappService.js';



// Helper to notify (avec WhatsApp)
async function notify(type, id, data) {
  // Socket notification
  emit(`${type}:${id}`, "notification", data);
  
  // // WhatsApp notification pour clients
  // if (type === 'client') {
  //   try {
  //     const client = await Client.findByPk(id);
  //     if (client?.phone_number) {
  //       let message = '';
        
  //       switch (data.type) {
  //         case 'order_accepted':
  //           message = templates.orderAccepted(
  //             data.restaurant || 'Restaurant', 
  //             data.orderNumber || data.orderId
  //           );
  //           break;
            
  //         case 'order_preparing':
  //           message = templates.orderPreparing(data.orderNumber || data.orderId);
  //           break;
            
  //         case 'driver_assigned':
  //           message = templates.driverAssigned(
  //             data.driver || 'Livreur', 
  //             data.phone || '', 
  //             data.orderNumber || data.orderId
  //           );
  //           break;
            
  //         case 'delivery_started':
  //           message = templates.orderDelivering(
  //             data.orderNumber || data.orderId, 
  //             data.eta_min || 30
  //           );
  //           break;
            
  //         case 'order_delivered':
  //           message = templates.orderDelivered(data.orderNumber || data.orderId);
  //           break;
            
  //         case 'order_declined':
  //           message = templates.orderDeclined(
  //             data.orderNumber || data.orderId, 
  //             data.reason || 'Non spécifiée'
  //           );
  //           break;

  //         case 'order_location':
  //           if (data.distance_km && data.eta_min) {
  //             message = templates.orderLocation(
  //               data.orderNumber || data.orderId,
  //               data.distance_km,
  //               data.eta_min
  //             );
  //           }
  //           break;
  //       }
        
  //       if (message) {
  //         await sendWhatsAppMessage(client.phone_number, message);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('WhatsApp notification error:', error);
  //     // Continue même si WhatsApp échoue
  //   }
  // }
}

// ==================== STATUS TRANSITIONS ====================

// ==================== STATUS TRANSITIONS ====================

export async function acceptOrder(orderId, userId, data = {}) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: 'client' }, { model: Restaurant, as: 'restaurant' }]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo('accepted')) {
    throw { status: 400, message: `Cannot accept order in ${order.status} status` };
  }
  
  // ✅ Get preparation time from restaurant (or default 15 min)
  const preparationMinutes = data?.preparation_time || 15;

  // ✅ Calculate when preparation should end
  const preparationEnd = new Date();
  preparationEnd.setMinutes(preparationEnd.getMinutes() + preparationMinutes);

  await order.update({
    status: 'accepted',
    preparation_time: preparationMinutes,
    accepted_at: new Date()
  });
  
  // Notify client
  notify('client', order.client_id, {
    type: 'order_accepted',
    orderId: order.id,
    orderNumber: order.order_number,
    restaurant: order.restaurant.name,
    message: `${order.restaurant.name} accepted your order. Estimated preparation time: ${preparationMinutes} min`
  });
  
  // ✅ MOVED: Notify NEARBY drivers here (after accepting, for delivery only)
  if (order.order_type === 'delivery') {
    const coords = order.delivery_location?.coordinates;
    
    console.log('📍 Order coordinates:', coords);
    
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      
      console.log(`🚨 Notifying nearby drivers for order ${order.id}`);
      console.log(`   Restaurant: ${order.restaurant.name}`);
      console.log(`   Delivery location: (${lat}, ${lng})`);
      
      try {
        const notifiedDrivers = await notifyNearbyDrivers(lat, lng, {
          orderId: order.id,
          orderNumber: order.order_number,
          restaurant: order.restaurant.name,
          restaurantAddress: order.restaurant.address,
          deliveryAddress: order.delivery_address,
          fee: parseFloat(order.delivery_fee || 0),
          estimatedTime: order.estimated_delivery_time,
          totalAmount: parseFloat(order.total_amount || 0)
        }, 10); // 10km radius
        
        console.log(`✅ ${notifiedDrivers.length} drivers notified successfully`);
      } catch (error) {
        console.error('❌ Error notifying drivers:', error);
      }
    } else {
      console.warn('⚠️ No valid delivery coordinates for order', orderId);
    }
  } else {
    console.log(`📦 Order ${orderId} is PICKUP - no driver notification needed`);
  }
  
  // Schedule admin notification if no driver accepts within 2 minutes
  scheduleAdminNotificationDriver(orderId);
  
  // ✅ Auto-transition to PREPARING after 1 minute
  setTimeout(() => startPreparing(orderId), 60000);
  
  // ✅ Auto-add 7 minutes if preparation time exceeds
  setTimeout(() => addExtraPreparationTime(orderId), preparationMinutes * 60 * 1000);
  
  return order;
}

export async function startPreparing(orderId) {
  const transaction = await sequelize.transaction();

  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: 'client' }, { model: Restaurant, as: 'restaurant' }]
  });
  
  if (!order || order.status !== 'accepted') {
    console.log(`⚠️ Order ${orderId} not found or not in accepted status`);
    return;
  }
  
  await order.update({ status: 'preparing' });
    
  await transaction.commit();

  console.log(`👨‍🍳 Order ${orderId} status changed to PREPARING`);
  
  // Notify client
  notify('client', order.client_id, {
    type: 'order_preparing',
    orderId: order.id,
    message: 'Your order is being prepared'
  });
  
  console.log(`✅ Client ${order.client_id} notified`);
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
    orderNumber: order.order_number,
    driver: driver.getFullName(),
    phone: driver.phone
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


  // Update driver location directly
  driver.setCurrentLocation(longitude, latitude);
  driver.last_active_at = new Date();
  await driver.save();

  // Notify client with current location and route info
  const order = await Order.findByPk(driver.active_order_id, {
    include: [{ model: Client, as: 'client' }]
  });

  if (order) {
    const currentLocation = driver.getCurrentCoordinates();
    const destinationCoords = order.delivery_location?.coordinates;
    
    let routeInfo = null;
    
    // Calculate real route distance and ETA
    if (destinationCoords && destinationCoords.length === 2) {
      const [destLng, destLat] = destinationCoords;
      routeInfo = await calculateRouteTime(longitude, latitude, destLng, destLat);
    }

    notify('client', order.client_id, {
      type: 'order_location',
      orderId: order.id,
      location: currentLocation,
      distance_km: routeInfo?.distanceKm || null,
      eta_min: routeInfo?.timeMin || null,
      eta_max: routeInfo?.timeMax || null,
      message: routeInfo 
        ? `Your order is ${routeInfo.distanceKm} km away (${routeInfo.timeMin}-${routeInfo.timeMax} min)`
        : 'Your order is on the way'
    });
  }
    
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

// ==================== SERVICE ====================
// Add this to order.service.js

/**
 * Get nearby orders for drivers
 * Uses driver's current location to find available orders
 */
export const getNearbyOrders = async (driverId, filters = {}) => {
  const {
    radius = 5000, // 5km default
    status = ['preparing'], // Ready for pickup
    page = 1,
    pageSize = 20,
    min_fee, // Minimum delivery fee
    max_distance // Maximum distance in meters
  } = filters;

  // Get driver and their current location
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw { status: 404, message: "Driver not found" };
  }

  if (!driver.current_location) {
    throw { status: 400, message: "Driver location not available. Please enable GPS." };
  }

  const coords = driver.getCurrentCoordinates();
  if (!coords) {
    throw { status: 400, message: "Invalid driver location" };
  }

  const { longitude, latitude } = coords;
  const searchRadius = parseInt(radius, 10);

  // Build WHERE conditions
  const whereConditions = {
    [Op.and]: [
      { order_type: 'delivery' }, // Only delivery orders
      { livreur_id: null }, // Unassigned only
      literal(
        `ST_DWithin(delivery_location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`
      )
    ]
  };

  // Status filter
  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    whereConditions[Op.and].push({
      status: { [Op.in]: statusArray }
    });
  }

  // Minimum fee filter
  if (min_fee) {
    whereConditions[Op.and].push({
      delivery_fee: { [Op.gte]: parseFloat(min_fee) }
    });
  }

  const limit = parseInt(pageSize, 10);
  const offset = (parseInt(page, 10) - 1) * limit;

  // Query orders with distance
  const { count, rows } = await Order.findAndCountAll({
    attributes: {
      include: [
        [
          literal(`ST_Distance(delivery_location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`),
          "distance"
        ]
      ]
    },
    where: whereConditions,
    include: [
      {
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'address', 'location', 'image_url']
      },
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'first_name', 'last_name', 'phone_number']
      }
    ],
    order: [
      [literal("distance"), "ASC"],
      ['created_at', 'DESC']
    ],
    limit,
    offset
  });

  // Format results
  const formatted = rows
    .map((order) => {
      const restaurantCoords = order.restaurant.location?.coordinates || [];
      const deliveryCoords = order.delivery_location?.coordinates || [];
      const distance = parseFloat(order.dataValues.distance);

      // Apply max distance filter if set
      if (max_distance && distance > max_distance) {
        return null;
      }

      return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: parseFloat(order.total_amount),
        delivery_fee: parseFloat(order.delivery_fee),
        delivery_address: order.delivery_address,
        delivery_location: {
          lat: deliveryCoords[1] || null,
          lng: deliveryCoords[0] || null
        },
        distance_meters: Math.round(distance),
        distance_km: (distance / 1000).toFixed(2),
        restaurant: {
          id: order.restaurant.id,
          name: order.restaurant.name,
          address: order.restaurant.address,
          location: {
            lat: restaurantCoords[1] || null,
            lng: restaurantCoords[0] || null
          },
          image_url: order.restaurant.image_url
        },
        client: {
          name: `${order.client.first_name} ${order.client.last_name}`,
          phone: order.client.phone_number
        },
        estimated_delivery_time: order.estimated_delivery_time,
        created_at: order.created_at
      };
    })
    .filter(order => order !== null); // Remove filtered orders

  return {
    orders: formatted,
    pagination: {
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(count / limit),
      total_items: count,
      items_in_page: formatted.length
    },
    driver_location: {
      lat: latitude,
      lng: longitude
    },
    search_radius_km: (searchRadius / 1000).toFixed(2)
  };
};

//  Add extra time if preparation exceeds
async function addExtraPreparationTime(orderId) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [{ model: Client, as: 'client' }]
    });
    
    // Only add time if still preparing
    if (!order || order.status !== 'preparing') {
      console.log(`⚠️ Order ${orderId} not in preparing status - skipping extra time`);
      return;
    }
    
    console.log(`⏰ Preparation time exceeded for order ${orderId} - adding 7 minutes`);
    
    // Add 7 minutes to preparation time
    const newPrepTime = (order.preparation_time || 15) + 7;
    
    // Update estimated delivery time
    if (order.estimated_delivery_time) {
      const newEstimatedTime = new Date(order.estimated_delivery_time);
      newEstimatedTime.setMinutes(newEstimatedTime.getMinutes() + 7);
      
      await order.update({
        preparation_time: newPrepTime,
        estimated_delivery_time: newEstimatedTime
      });
    } else {
      await order.update({
        preparation_time: newPrepTime
      });
    }
    
    // Notify client about delay
    notify('client', order.client_id, {
      type: 'preparation_delayed',
      orderId: order.id,
      orderNumber: order.order_number,
      extra_minutes: 7,
      new_preparation_time: newPrepTime,
      message: `Your order preparation is taking a bit longer. Added 7 minutes. New estimate: ${newPrepTime} minutes total.`
    });
    
    console.log(`✅ Added 7 minutes to order ${orderId}. New prep time: ${newPrepTime} min`);
    
  } catch (error) {
    console.error(`❌ Error adding extra time to order ${orderId}:`, error);
  }
}

// Schedule admin notification if restaurant doesn't respond
export async function scheduleAdminNotification(orderId) {
  setTimeout(async () => {
    try {
      const order = await Order.findByPk(orderId);
      
      // Only notify if still pending after 3 minutes
      if (order && order.status === 'pending') {
        console.log(`⏰ 3 minutes elapsed - Restaurant hasn't responded to order ${orderId}`);
        
        // Import the service
        const { createPendingOrderNotification } = await import('./adminNotification.service.js');
        
        // Create notification in database + emit via Socket.IO
        await createPendingOrderNotification(orderId);
      }
    } catch (error) {
      console.error('❌ Error scheduling admin notification:', error);
    }
  }, 3 * 60 * 1000); // 3 minutes
}


// Schedule admin notification if restaurant doesn't respond
export async function scheduleAdminNotificationDriver(orderId) {
  setTimeout(async () => {
    try {
      const order = await Order.findByPk(orderId);
      
      // Only notify if still pending after 3 minutes
      if (order && order.status === 'preparing') {
        console.log(`⏰ 3 minutes elapsed - drivers haven't responded to order ${orderId}`);
        
        // Import the service
        const { createAcceptedOrderNotification } = await import('./adminNotification.service.js');
        
        // Create notification in database + emit via Socket.IO
        await createAcceptedOrderNotification(orderId);
      }
    } catch (error) {
      console.error('❌ Error scheduling admin notification:', error);
    }
  }, 2 * 60 * 1000); // 3 minutes
}
