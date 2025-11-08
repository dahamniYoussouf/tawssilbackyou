import Order from "../../models/Order.js";
// If you actually create admin notifications on timers:
import AdminNotification from "../../models/AdminNotification.js";
import { emit } from "../../config/socket.js";
// import { notify } from "./notify.helper.js"; // not required here but available

export async function addExtraPreparationTime(orderId) {
  try {
    const order = await Order.findByPk(orderId, { include: [{ model: (await import("../../models/Client.js")).default, as: "client" }] });
    if (!order || order.status !== "preparing") return;

    const newPrepTime = (order.preparation_time || 15) + 7;

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
  }, 3 * 60 * 1000);
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
