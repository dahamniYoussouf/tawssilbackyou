import { sequelize } from "../../config/database.js";
import Order from "../../models/Order.js";
import Restaurant from "../../models/Restaurant.js";
import Client from "../../models/Client.js";
import Driver from "../../models/Driver.js";
import SystemConfig from "../../models/SystemConfig.js";
import { notifyNearbyDrivers } from "../../config/socket.js";
import calculateRouteTime from "../routingService.js";
import { canDriverAcceptOrder } from "../multiDeliveryService.js";
import { notify } from "./notify.helper.js";
import { scheduleAdminNotificationDriver, addExtraPreparationTime } from "./scheduling.service.js";

// ✅ Award loyalty points to client (1 point per 100 DZD)
async function awardLoyaltyPoints(clientId, orderTotal, orderId) {
  try {
    if (!clientId || !orderTotal) return;
    
    const client = await Client.findByPk(clientId);
    if (!client) return;
    
    // 1 point for every 100 DZD spent
    const points = Math.floor(parseFloat(orderTotal) / 100);
    
    if (points <= 0) return;
    
    const newTotal = (client.loyalty_points || 0) + points;
    await client.update({ loyalty_points: newTotal });
    
    console.log(`✅ Awarded ${points} loyalty points to client ${clientId} (Order: ${orderId}). New total: ${newTotal}`);
    
    return newTotal;
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
  }
}

export async function acceptOrder(orderId, userId, data = {}) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: "client" }, { model: Restaurant, as: "restaurant" }],
  });
  
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo("accepted")) {
    throw { status: 400, message: `Cannot accept order in ${order.status} status` };
  }

  let preparationMinutes = Number.parseInt(String(data?.preparation_time ?? ''), 10);
  if (!Number.isFinite(preparationMinutes) || preparationMinutes <= 0) {
    const configuredDefault = await SystemConfig.get('default_preparation_time', 15);
    const parsedConfigured = Number.parseInt(String(configuredDefault), 10);
    preparationMinutes = Number.isFinite(parsedConfigured)
      ? Math.min(120, Math.max(5, parsedConfigured))
      : 15;
  } else {
    preparationMinutes = Math.min(120, Math.max(5, preparationMinutes));
  }

  let deliveryTimeMinutes = preparationMinutes;
  let deliveryDistanceKm = order.delivery_distance;
  let estimatedDeliveryTime = new Date(Date.now() + preparationMinutes * 60 * 1000);

  if (order.order_type === "delivery") {
    const restaurantCoords = order.restaurant?.getCoordinates?.();
    const deliveryCoords = order.delivery_location?.coordinates;

    if (restaurantCoords && deliveryCoords && deliveryCoords.length === 2) {
      const [deliveryLng, deliveryLat] = deliveryCoords;

      try {
        const route = await calculateRouteTime(
          restaurantCoords.longitude,
          restaurantCoords.latitude,
          deliveryLng,
          deliveryLat,
          40
        );

        deliveryTimeMinutes = preparationMinutes + route.timeMax;
        deliveryDistanceKm = route.distanceKm;
        estimatedDeliveryTime = new Date(Date.now() + deliveryTimeMinutes * 60 * 1000);

        console.log(`📍 Route Restaurant→Client: ${route.distanceKm} km, ~${route.timeMax} min`);
        console.log(`⏱️ Temps total: ${preparationMinutes} min (préparation) + ${route.timeMax} min (trajet) = ${deliveryTimeMinutes} min`);
      } catch (error) {
        console.error('❌ Erreur calcul route restaurant→client:', error.message);
        const defaultDeliveryTime = 20;
        deliveryTimeMinutes = preparationMinutes + defaultDeliveryTime;
        estimatedDeliveryTime = new Date(Date.now() + deliveryTimeMinutes * 60 * 1000);
        console.warn(`⚠️ Utilisation estimation par défaut: ${defaultDeliveryTime} min pour le trajet`);
      }
    } else {
      console.warn(`⚠️ Coordonnées manquantes pour calculer le trajet (order ${orderId})`);
    }
  }

  await order.update({
    status: "accepted",
    preparation_time: preparationMinutes,
    accepted_at: new Date(),
    estimated_delivery_time: estimatedDeliveryTime,
    ...(deliveryDistanceKm && { delivery_distance: deliveryDistanceKm }),
  });

  let message = `${order.restaurant.name} accepted your order.`;
  if (order.order_type === "delivery") {
    message += ` Estimated delivery time: ${deliveryTimeMinutes} min (${preparationMinutes} min preparation + ${deliveryTimeMinutes - preparationMinutes} min delivery)`;
  } else {
    message += ` Estimated preparation time: ${preparationMinutes} min`;
  }

  notify("client", order.client_id, {
    type: "order_accepted",
    orderId: order.id,
    orderNumber: order.order_number,
    restaurant: order.restaurant.name,
    message: message,
    preparation_time: preparationMinutes,
    ...(order.order_type === "delivery" && {
      delivery_time: deliveryTimeMinutes - preparationMinutes,
      total_delivery_time: deliveryTimeMinutes,
      estimated_delivery_time: estimatedDeliveryTime
    })
  });

  if (order.order_type === "delivery") {
    const restaurantCoords = order.restaurant?.getCoordinates?.();
    
    if (restaurantCoords) {
      const { latitude: lat, longitude: lng } = restaurantCoords;
      
      console.log(`🚀 Notifying drivers for order ${order.order_number}`);
      console.log(`📍 Restaurant location: [${lat}, ${lng}]`);
      
      try {
        const notifiedDrivers = await notifyNearbyDrivers(
          lat,
          lng,
          {
            orderId: order.id,
            orderNumber: order.order_number,
            restaurant: order.restaurant.name,
            restaurantAddress: order.restaurant.address,
            deliveryAddress: order.delivery_address,
            fee: parseFloat(order.delivery_fee || 0),
            estimatedTime: estimatedDeliveryTime,
            totalAmount: parseFloat(order.total_amount || 0),
          },
          5
        );
        
        if (notifiedDrivers.length === 0) {
          console.warn(`⚠️ No drivers notified for order ${order.order_number}`);
        }
        
      } catch (error) {
        console.error(`❌ Error notifying drivers for order ${order.order_number}:`, error);
      }
      
    } else {
      console.warn(`⚠️ No valid restaurant coordinates for order ${orderId}`);
    }
  }

  scheduleAdminNotificationDriver(orderId);
  setTimeout(() => startPreparing(orderId), 60_000);
  setTimeout(() => addExtraPreparationTime(orderId), preparationMinutes * 60_000);

  return order;
}

export async function startPreparing(orderId) {
  const transaction = await sequelize.transaction();
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: "client" }, { model: Restaurant, as: "restaurant" }],
    transaction,
  });

  if (!order || order.status !== "accepted") {
    await transaction.rollback();
    return;
  }

  await order.update({ status: "preparing" }, { transaction });
  await transaction.commit();

  notify("client", order.client_id, {
    type: "order_preparing",
    orderId: order.id,
    message: "Your order is being prepared",
  });
}

export async function assignDriverOrComplete(orderId, driverId = null) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: "client" }, { model: Restaurant, as: "restaurant" }],
  });
  if (!order) throw { status: 404, message: "Order not found" };

  if (order.order_type === "pickup") {
    await order.update({ status: "delivered", livreur_id: null, delivered_at: new Date() });
    
    // ✅ Award loyalty points for pickup orders
    if (order.client_id && order.total_amount) {
      await awardLoyaltyPoints(order.client_id, order.total_amount, order.id);
    }
    
    notify("client", order.client_id, {
      type: "order_ready",
      orderId: order.id,
      message: "Order ready for pickup!",
    });
    return order;
  }

  if (order.livreur_id) throw { status: 400, message: "Order already assigned" };

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw { status: 400, message: "Driver not found" };
  if (!driver.is_verified) throw { status: 400, message: "Driver account is not verified" };

  const canAccept = await canDriverAcceptOrder(driverId, orderId);
  if (!canAccept.canAccept) {
    throw { status: 400, message: canAccept.reason || "Driver cannot accept this order" };
  }

  let routeInfo = null;
  
  try {
    const restaurantCoords = order.restaurant.getCoordinates();
    const driverCoords = driver.getCurrentCoordinates();
    
    if (restaurantCoords && driverCoords) {
      const route = await calculateRouteTime(
        driverCoords.longitude,
        driverCoords.latitude,
        restaurantCoords.longitude,
        restaurantCoords.latitude,
        40
      );
      
      routeInfo = {
        distance_km: route.distanceKm,
        estimated_time_min: route.timeMin
      };
      
      console.log(`📍 Route Driver→Restaurant: ${route.distanceKm} km, ~${route.timeMax} min`);
    } else {
      console.warn('⚠️ Missing coordinates for driver or restaurant');
    }
  } catch (error) {
    console.error('Route calculation failed:', error.message);
  }

  await order.update({ status: "assigned", livreur_id: driverId });
  await driver.addActiveOrder(orderId);

  notify("client", order.client_id, {
    type: "driver_assigned",
    orderId: order.id,
    driver: { 
      name: driver.getFullName(), 
      phone: driver.phone, 
      vehicle: driver.vehicle_type,
      ...(routeInfo && { 
        distance_to_restaurant_km: routeInfo.distance_km,
        estimated_arrival_min: routeInfo.estimated_time_min
      })
    },
  });

  notify("driver", driverId, {
    type: "order_assigned",
    orderId: order.id,
    orderNumber: order.order_number,
    restaurant: order.restaurant.name,
    deliveryAddress: order.delivery_address,
    active_orders_count: driver.getActiveOrdersCount(),
    ...(routeInfo && { 
      route_to_restaurant: {
        distance_km: routeInfo.distance_km,
        estimated_time_min: routeInfo.estimated_time_min
      }
    })
  });

  return {
    ...order.toJSON(),
    driver_to_restaurant_distance_km: routeInfo?.distance_km,          
    driver_to_restaurant_estimated_time_min: routeInfo?.estimated_time_min
  };
}

export async function startDelivering(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: "client" }, { model: Driver, as: "driver" }],
  });
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo("delivering")) {
    throw { status: 400, message: `Cannot start delivery from ${order.status} status` };
  }

  await order.update({ status: "delivering" });

  notify("client", order.client_id, {
    type: "delivery_started",
    orderId: order.id,
    message: "Your order is on the way!",
  });

  return order;
}

export async function driverArrived(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Restaurant, as: "restaurant" },
      { model: Client, as: "client" },
      { model: Driver, as: "driver" },
    ],
  });
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo("arrived")) {
    throw { status: 400, message: `Cannot mark arrived from ${order.status} status` };
  }

  await order.update({ status: "arrived", arrived_at: new Date() });

  const rest = order.restaurant?.getCoordinates?.();
  const dest = order.delivery_location?.coordinates
    ? { longitude: order.delivery_location.coordinates[0], latitude: order.delivery_location.coordinates[1] }
    : null;

  let route = null;
  if (rest && dest) route = await calculateRouteTime(rest.longitude, rest.latitude, dest.longitude, dest.latitude);

  return { ...order.toJSON(), route };
}

export async function completeDelivery(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: "client" }, { model: Driver, as: "driver" }],
  });
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo("delivered")) {
    throw { status: 400, message: `Cannot complete from ${order.status} status` };
  }
  
  const driverId = order.livreur_id;
  
  await order.update({ status: "delivered", livreur_id: null, delivered_at: new Date() });

  // ✅ Award loyalty points for delivery orders
  if (order.client_id && order.total_amount) {
    await awardLoyaltyPoints(order.client_id, order.total_amount, order.id);
  }

  if (driverId) {
    const driver = await Driver.findByPk(driverId);
    if (driver) {
      await driver.removeActiveOrder(orderId);
      driver.total_deliveries += 1;
      await driver.save();

      notify("driver", driver.id, {
        type: "delivery_complete",
        orderId: order.id,
        active_orders_count: driver.getActiveOrdersCount(),
        message:
          driver.getActiveOrdersCount() > 0
            ? `Delivery completed! ${driver.getActiveOrdersCount()} order(s) remaining`
            : "All deliveries completed! You are now available",
      });
    }
  }

  notify("client", order.client_id, {
    type: "order_delivered",
    orderId: order.id,
    message: "Order delivered!",
  });

  return order;
}

export async function declineOrder(orderId, reason) {
  const order = await Order.findByPk(orderId, { include: [{ model: Client, as: "client" }] });
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo("declined")) {
    throw { status: 400, message: `Cannot decline order in ${order.status} status` };
  }

  await order.update({ status: "declined", decline_reason: reason });

  notify("client", order.client_id, {
    type: "order_declined",
    orderId: order.id,
    reason,
  });

  return order;
}
