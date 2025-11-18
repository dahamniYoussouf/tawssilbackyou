import { sequelize } from "../../config/database.js";
import Order from "../../models/Order.js";
import Restaurant from "../../models/Restaurant.js";
import Client from "../../models/Client.js";
import Driver from "../../models/Driver.js";
import { notifyNearbyDrivers } from "../../config/socket.js";
import calculateRouteTime from "../routingService.js";
import { canDriverAcceptOrder } from "../multiDeliveryService.js";
import { notify } from "./notify.helper.js";
import { scheduleAdminNotificationDriver, addExtraPreparationTime } from "./scheduling.service.js";

export async function acceptOrder(orderId, userId, data = {}) {
  const order = await Order.findByPk(orderId, {
    include: [{ model: Client, as: "client" }, { model: Restaurant, as: "restaurant" }],
  });
  if (!order) throw { status: 404, message: "Order not found" };
  if (!order.canTransitionTo("accepted")) {
    throw { status: 400, message: `Cannot accept order in ${order.status} status` };
  }

  const preparationMinutes = data?.preparation_time || 15;

  await order.update({
    status: "accepted",
    preparation_time: preparationMinutes,
    accepted_at: new Date(),
  });

  notify("client", order.client_id, {
    type: "order_accepted",
    orderId: order.id,
    orderNumber: order.order_number,
    restaurant: order.restaurant.name,
    message: `${order.restaurant.name} accepted your order. Estimated preparation time: ${preparationMinutes} min`,
  });

  if (order.order_type === "delivery") {
    const coords = order.delivery_location?.coordinates;
    if (coords?.length === 2) {
      const [lng, lat] = coords;
      try {
        await notifyNearbyDrivers(
          lat,
          lng,
          {
            orderId: order.id,
            orderNumber: order.order_number,
            restaurant: order.restaurant.name,
            restaurantAddress: order.restaurant.address,
            deliveryAddress: order.delivery_address,
            fee: parseFloat(order.delivery_fee || 0),
            estimatedTime: order.estimated_delivery_time,
            totalAmount: parseFloat(order.total_amount || 0),
          },
          10 // km
        );
      } catch (error) {
        console.error("❌ Error notifying drivers:", error);
      }
    } else {
      console.warn("⚠️ No valid delivery coordinates for order", orderId);
    }
  } else {
    // pickup: no driver notification
  }

  // Admin + timers
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
  if (order.status !== "preparing") throw { status: 400, message: "Order must be in preparing status" };

  // PICKUP => complete directly
  if (order.order_type === "pickup") {
    await order.update({ status: "delivered", livreur_id: null, delivered_at: new Date() });
    notify("client", order.client_id, {
      type: "order_ready",
      orderId: order.id,
      message: "Order ready for pickup!",
    });
    return order;
  }

  // DELIVERY
  if (order.livreur_id) throw { status: 400, message: "Order already assigned" };

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw { status: 400, message: "Driver not found" };
  if (!driver.is_verified) throw { status: 400, message: "Driver account is not verified" };

  const canAccept = await canDriverAcceptOrder(driverId, orderId);
  if (!canAccept.canAccept) {
    throw { status: 400, message: canAccept.reason || "Driver cannot accept this order" };
  }

  await order.update({ status: "assigned", livreur_id: driverId });
  await driver.addActiveOrder(orderId);

  notify("client", order.client_id, {
    type: "driver_assigned",
    orderId: order.id,
    driver: { name: driver.getFullName(), phone: driver.phone, vehicle: driver.vehicle_type },
  });

  notify("driver", driverId, {
    type: "order_assigned",
    orderId: order.id,
    orderNumber: order.order_number,
    restaurant: order.restaurant.name,
    deliveryAddress: order.delivery_address,
    active_orders_count: driver.getActiveOrdersCount(),
  });

  return order;
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
  // mark delivered + unassign
  await order.update({ status: "delivered", livreur_id: null, delivered_at: new Date() });

  // If there was a driver, update their active orders
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
