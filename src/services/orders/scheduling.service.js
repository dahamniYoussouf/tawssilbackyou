import Order from "../../models/Order.js";
// If you actually create admin notifications on timers:
import AdminNotification from "../../models/AdminNotification.js";
import { emit } from "../../config/socket.js";
import SystemConfig from "../../models/SystemConfig.js";
// import { notify } from "./notify.helper.js"; // not required here but available

export async function addExtraPreparationTime(orderId) {
  try {
    const order = await Order.findByPk(orderId, { include: [{ model: (await import("../../models/Client.js")).default, as: "client" }] });
    if (!order || order.status !== "preparing") return;

    let basePreparationMinutes = Number.parseInt(String(order.preparation_time ?? ''), 10);
    if (!Number.isFinite(basePreparationMinutes) || basePreparationMinutes <= 0) {
      const configuredDefault = await SystemConfig.get('default_preparation_time', 15);
      const parsedConfigured = Number.parseInt(String(configuredDefault), 10);
      basePreparationMinutes = Number.isFinite(parsedConfigured)
        ? Math.min(120, Math.max(5, parsedConfigured))
        : 15;
    }

    const newPrepTime = basePreparationMinutes + 7;

    if (order.estimated_delivery_time) {
      const newEstimatedTime = new Date(order.estimated_delivery_time);
      newEstimatedTime.setMinutes(newEstimatedTime.getMinutes() + 7);
      await order.update({ preparation_time: newPrepTime, estimated_delivery_time: newEstimatedTime });
    } else {
      await order.update({ preparation_time: newPrepTime });
    }

    // Optional: client notify here if desired
    // notify('client', order.client_id, {...});
  } catch (error) {
    console.error(`❌ Error adding extra time to order ${orderId}:`, error);
  }
}

export function scheduleAdminNotification(orderId) {
  void (async () => {
    let timeoutMinutes = 3;

    try {
      const configuredTimeout = await SystemConfig.get('pending_order_timeout', 3);
      const parsedTimeout = Number.parseInt(String(configuredTimeout), 10);
      if (Number.isFinite(parsedTimeout) && parsedTimeout >= 1 && parsedTimeout <= 60) {
        timeoutMinutes = parsedTimeout;
      }
    } catch (error) {
      console.error("❌ Error reading pending_order_timeout config:", error);
    }

    setTimeout(async () => {
      try {
        const order = await Order.findByPk(orderId);
        if (order && order.status === "pending") {
          const { createPendingOrderNotification } = await import("../adminNotification.service.js");
          await createPendingOrderNotification(orderId);
        }
      } catch (error) {
        console.error("❌ Error scheduling admin notification:", error);
      }
    }, timeoutMinutes * 60 * 1000);
  })();
}

export function scheduleAdminNotificationDriver(orderId) {
  setTimeout(async () => {
    try {
      const order = await Order.findByPk(orderId);
      if (order && order.status === "preparing") {
        const { createAcceptedOrderNotification } = await import("../adminNotification.service.js");
        await createAcceptedOrderNotification(orderId);
      }
    } catch (error) {
      console.error("❌ Error scheduling admin notification (driver):", error);
    }
  }, 2 * 60 * 1000);
}
