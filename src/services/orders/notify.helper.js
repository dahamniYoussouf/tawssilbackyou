import Client from "../../models/Client.js";
import { emit } from "../../config/socket.js";
// If you want WhatsApp, uncomment these and the block below:
// import { sendWhatsAppMessage, templates } from '../whatsappService.js';

export async function notify(type, id, data) {
  // Socket notification
  emit(`${type}:${id}`, "notification", data);

  // Optional: WhatsApp to client (kept off by default)
  // if (type === 'client') {
  //   try {
  //     const client = await Client.findByPk(id);
  //     if (client?.phone_number) {
  //       let message = '';
  //       switch (data.type) {
  //         case 'order_accepted':
  //           message = templates.orderAccepted(data.restaurant || 'Restaurant', data.orderNumber || data.orderId);
  //           break;
  //         case 'order_preparing':
  //           message = templates.orderPreparing(data.orderNumber || data.orderId);
  //           break;
  //         case 'driver_assigned':
  //           message = templates.driverAssigned(data.driver || 'Livreur', data.phone || '', data.orderNumber || data.orderId);
  //           break;
  //         case 'delivery_started':
  //           message = templates.orderDelivering(data.orderNumber || data.orderId, data.eta_min || 30);
  //           break;
  //         case 'order_delivered':
  //           message = templates.orderDelivered(data.orderNumber || data.orderId);
  //           break;
  //         case 'order_declined':
  //           message = templates.orderDeclined(data.orderNumber || data.orderId, data.reason || 'Non spécifiée');
  //           break;
  //         case 'order_location':
  //           if (data.distance_km && data.eta_min) {
  //             message = templates.orderLocation(data.orderNumber || data.orderId, data.distance_km, data.eta_min);
  //           }
  //           break;
  //       }
  //       if (message) await sendWhatsAppMessage(client.phone_number, message);
  //     }
  //   } catch (error) {
  //     console.error('WhatsApp notification error:', error);
  //   }
  // }
}
