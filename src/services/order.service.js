import { Op, literal } from "sequelize";
import { sequelize } from "../config/database.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import Driver from "../models/Driver.js";
import AdminNotification from "../models/AdminNotification.js";
import { emit, notifyNearbyDrivers } from "../config/socket.js";
import calculateRouteTime from '../services/routingService.js'; 
import { sendWhatsAppMessage, templates } from './whatsappService.js';
import { canDriverAcceptOrder } from './multiDeliveryService.js'; // ✅ IMPORT MISSING FUNCTION


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
    include: [{ model: Client, as: 'client' }, { model: Restaurant, as: 'restaurant' }],
    transaction 
  });
  
  if (!order || order.status !== 'accepted') {
    console.log(`⚠️ Order ${orderId} not found or not in accepted status`);
    return;
  }
  
  await order.update({ status: 'preparing' }, { transaction });
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
    include: [
      { model: Client, as: 'client' },
      { model: Restaurant, as: 'restaurant' }
    ]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (order.status !== 'preparing') {
    throw { status: 400, message: "Order must be in preparing status" };
  }
  
  // PICKUP - compléter directement
  if (order.order_type === 'pickup') {
    await order.update({ status: 'delivered' });
    notify('client', order.client_id, {
      type: 'order_ready',
      orderId: order.id,
      message: 'Order ready for pickup!'
    });
    return order;
  }
  
  // DELIVERY - vérifier si déjà assigné
  if (order.livreur_id) {
    throw { status: 400, message: "Order already assigned" };
  }
  
  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw { status: 400, message: "Driver not found" };
  }

  // ✅ NOUVELLE LOGIQUE : Vérifier si le livreur peut accepter
  const canAccept = await canDriverAcceptOrder(driverId, orderId);
  
  if (!canAccept.canAccept) {
    throw { 
      status: 400, 
      message: canAccept.reason || "Driver cannot accept this order" 
    };
  }

  // Assigner la commande
  await order.update({ 
    status: 'assigned', 
    livreur_id: driverId 
  });

  // ✅ Ajouter la commande aux commandes actives du livreur
  await driver.addActiveOrder(orderId);

  // Notifier le client et le livreur
  notify('client', order.client_id, {
    type: 'driver_assigned',
    orderId: order.id,
    driver: {
      name: driver.getFullName(),
      phone: driver.phone,
      vehicle: driver.vehicle_type
    }
  });

  notify('driver', driverId, {
    type: 'order_assigned',
    orderId: order.id,
    orderNumber: order.order_number,
    restaurant: order.restaurant.name,
    deliveryAddress: order.delivery_address,
    active_orders_count: driver.getActiveOrdersCount()
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

  // Notify clients for ALL active orders
  if (driver.hasActiveOrders()) {
    const orders = await Order.findAll({
      where: {
        id: driver.active_orders,
        status: 'delivering'
      },
      include: [{ model: Client, as: 'client' }]
    });

    const currentLocation = driver.getCurrentCoordinates();

    for (const order of orders) {
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
  }
    
  return { 
    driver_id: driverId, 
    active_orders: driver.active_orders 
  };
}

export async function getDriverActiveOrders(driverId) {
  const driver = await Driver.findByPk(driverId);
  
  if (!driver) {
    throw { status: 404, message: "Driver not found" };
  }

  if (!driver.hasActiveOrders()) {
    return {
      driver_id: driverId,
      active_orders: [],
      count: 0,
      capacity: driver.max_orders_capacity
    };
  }

  const orders = await Order.findAll({
    where: {
      id: driver.active_orders
    },
    include: [
      {
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'address', 'location']
      },
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'first_name', 'last_name', 'phone_number']
      }
    ],
    order: [['assigned_at', 'ASC']]
  });

  return {
    driver_id: driverId,
    active_orders: orders.map(order => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      restaurant: {
        name: order.restaurant.name,
        address: order.restaurant.address,
        location: order.restaurant.location?.coordinates
      },
      delivery_address: order.delivery_address,
      delivery_location: order.delivery_location?.coordinates,
      total_amount: parseFloat(order.total_amount),
      assigned_at: order.assigned_at
    })),
    count: orders.length,
    capacity: driver.max_orders_capacity
  };
}

export async function completeDelivery(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Client, as: 'client' },
      { model: Driver, as: 'driver' }
    ]
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo('delivered')) {
    throw { status: 400, message: `Cannot complete from ${order.status} status` };
  }
  
  await order.update({ status: 'delivered' });
  
  // ✅ Retirer la commande des commandes actives du livreur
  if (order.livreur_id) {
    const driver = await Driver.findByPk(order.livreur_id);
    if (driver) {
      await driver.removeActiveOrder(orderId);
      driver.total_deliveries += 1;
      await driver.save();

      // Notifier le livreur du nombre de commandes restantes
      notify('driver', driver.id, {
        type: 'delivery_complete',
        orderId: order.id,
        active_orders_count: driver.getActiveOrdersCount(),
        message: driver.getActiveOrdersCount() > 0 
          ? `Delivery completed! ${driver.getActiveOrdersCount()} order(s) remaining`
          : 'All deliveries completed! You are now available'
      });
    }
  }
  
  notify('client', order.client_id, {
    type: 'order_delivered',
    orderId: order.id,
    message: 'Order delivered!'
  });
  
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

/**
 * Get nearby orders for drivers
 */
export const getNearbyOrders = async (driverId, filters = {}) => {
  const {
    radius = 5000,
    status = ['preparing'],
    page = 1,
    pageSize = 20,
    min_fee,
    max_distance
  } = filters;

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

  const whereConditions = {
    [Op.and]: [
      { order_type: 'delivery' },
      { livreur_id: null },
      literal(
        `ST_DWithin(delivery_location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`
      )
    ]
  };

  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    whereConditions[Op.and].push({
      status: { [Op.in]: statusArray }
    });
  }

  if (min_fee) {
    whereConditions[Op.and].push({
      delivery_fee: { [Op.gte]: parseFloat(min_fee) }
    });
  }

  const limit = parseInt(pageSize, 10);
  const offset = (parseInt(page, 10) - 1) * limit;

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

  const formatted = rows
    .map((order) => {
      const restaurantCoords = order.restaurant.location?.coordinates || [];
      const deliveryCoords = order.delivery_location?.coordinates || [];
      const distance = parseFloat(order.dataValues.distance);

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
    .filter(order => order !== null);

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

async function addExtraPreparationTime(orderId) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [{ model: Client, as: 'client' }]
    });
    
    if (!order || order.status !== 'preparing') {
      console.log(`⚠️ Order ${orderId} not in preparing status - skipping extra time`);
      return;
    }
    
    console.log(`⏰ Preparation time exceeded for order ${orderId} - adding 7 minutes`);
    
    const newPrepTime = (order.preparation_time || 15) + 7;
    
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

export async function scheduleAdminNotification(orderId) {
  setTimeout(async () => {
    try {
      const order = await Order.findByPk(orderId);
      
      if (order && order.status === 'pending') {
        console.log(`⏰ 3 minutes elapsed - Restaurant hasn't responded to order ${orderId}`);
        
        const { createPendingOrderNotification } = await import('./adminNotification.service.js');
        await createPendingOrderNotification(orderId);
      }
    } catch (error) {
      console.error('❌ Error scheduling admin notification:', error);
    }
  }, 3 * 60 * 1000);
}

export async function scheduleAdminNotificationDriver(orderId) {
  setTimeout(async () => {
    try {
      const order = await Order.findByPk(orderId);
      
      if (order && order.status === 'preparing') {
        console.log(`⏰ 3 minutes elapsed - drivers haven't responded to order ${orderId}`);
        
        const { createAcceptedOrderNotification } = await import('./adminNotification.service.js');
        await createAcceptedOrderNotification(orderId);
      }
    } catch (error) {
      console.error('❌ Error scheduling admin notification:', error);
    }
  }, 2 * 60 * 1000);
}

export async function driverCancelOrder(orderId, driverId, reason) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Client, as: 'client' },
      { model: Restaurant, as: 'restaurant' },
      { model: Driver, as: 'driver' }
    ]
  });

  if (!order) {
    throw { status: 404, message: "Order not found" };
  }

  if (order.livreur_id !== driverId) {
    throw { status: 403, message: "You are not assigned to this order" };
  }

  if (!['assigned', 'delivering'].includes(order.status)) {
    throw { 
      status: 400, 
      message: `Cannot cancel order in ${order.status} status` 
    };
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw { status: 404, message: "Driver not found" };
  }

  const transaction = await sequelize.transaction();

  try {
    const cancellationCount = await driver.incrementCancellations();
    console.log(`🚫 Driver ${driver.driver_code} cancelled order ${order.order_number} (total: ${cancellationCount})`);

    const previousStatus = order.status;
    await order.update({
      status: 'preparing',
      livreur_id: null,
      decline_reason: `[DRIVER CANCELLED] ${reason}`
    }, { transaction });

    await driver.removeActiveOrder(orderId);
    await driver.save({ transaction });

    await transaction.commit();

    notify('client', order.client_id, {
      type: 'delivery_cancelled',
      orderId: order.id,
      orderNumber: order.order_number,
      message: `Votre livreur a annulé la livraison. Nous recherchons un nouveau livreur...`,
      reason: reason
    });

    if (previousStatus === 'delivering' && order.delivery_location?.coordinates) {
      const [lng, lat] = order.delivery_location.coordinates;
      
      console.log(`🔄 Recherche d'un nouveau livreur pour la commande ${order.order_number}...`);
      
      await notifyNearbyDrivers(lat, lng, {
        orderId: order.id,
        orderNumber: order.order_number,
        restaurant: order.restaurant.name,
        restaurantAddress: order.restaurant.address,
        deliveryAddress: order.delivery_address,
        fee: parseFloat(order.delivery_fee || 0),
        estimatedTime: order.estimated_delivery_time,
        totalAmount: parseFloat(order.total_amount || 0),
        urgent: true
      }, 10);
    }

    if (driver.shouldNotifyAdmin()) {
      await createDriverCancellationNotification(driverId, cancellationCount);
    }
    
    scheduleAdminNotificationDriver(orderId);

    return {
      order,
      driver: {
        id: driver.id,
        name: driver.getFullName(),
        cancellation_count: cancellationCount
      }
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function createDriverCancellationNotification(driverId, cancellationCount) {
  try {
    const driver = await Driver.findByPk(driverId);
    if (!driver) return;

    const message = `⚠️ ALERTE: Le livreur ${driver.getFullName()} (${driver.driver_code}) a annulé ${cancellationCount} commandes.\n\n` +
                    `📞 Contact: ${driver.phone}\n` +
                    `📧 Email: ${driver.email || 'Non renseigné'}\n\n` +
                    `Action requise: Vérifier le comportement du livreur.`;

    const driverInfo = {
      id: driver.id,
      driver_code: driver.driver_code,
      name: driver.getFullName(),
      phone: driver.phone,
      email: driver.email,
      cancellation_count: cancellationCount,
      total_deliveries: driver.total_deliveries,
      rating: driver.rating,
      status: driver.status,
      created_at: driver.created_at
    };

    const notification = await AdminNotification.create({
      driver_id: driverId,
      order_id: null,
      restaurant_id: null,
      type: 'driver_excessive_cancellations',
      message,
      order_details: { driver_info: driverInfo }
    });

    console.log(`🔔 Admin notification created for driver ${driver.driver_code} (${cancellationCount} cancellations)`);

    emit('admin', 'driver_alert', {
      id: notification.id,
      type: 'driver_excessive_cancellations',
      message,
      driver: driverInfo,
      cancellation_count: cancellationCount,
      created_at: notification.created_at
    });

    emit('admins', 'driver_alert', {
      id: notification.id,
      type: 'driver_excessive_cancellations',
      message,
      driver: driverInfo,
      cancellation_count: cancellationCount,
      created_at: notification.created_at
    });

    return notification;

  } catch (error) {
    console.error('❌ Error creating driver cancellation notification:', error);
    return null;
  }
}