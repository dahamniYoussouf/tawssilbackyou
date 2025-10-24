import AdminNotification from "../models/AdminNotification.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import { emit } from "../config/socket.js";

/**
 * Créer une notification admin pour commande non répondue
 */
export const createPendingOrderNotification = async (orderId) => {
  try {
    // Récupérer toutes les infos de la commande
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address']
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'phone_number', 'address']
        },
        {
          model: OrderItem,
          as: 'order_items',
          include: [{
            model: MenuItem,
            as: 'menu_item',
            attributes: ['nom', 'prix']
          }]
        }
      ]
    });

    if (!order) {
      console.error(`❌ Order ${orderId} not found for admin notification`);
      return null;
    }

    // Vérifier si encore en pending
    if (order.status !== 'pending') {
      console.log(`⚠️ Order ${orderId} no longer pending, skipping notification`);
      return null;
    }

    // Préparer les données
    const orderDetails = {
      order_number: order.order_number,
      order_type: order.order_type,
      total_amount: parseFloat(order.total_amount || 0),
      delivery_address: order.delivery_address,
      created_at: order.created_at,
      items: order.order_items.map(item => ({
        name: item.menu_item.nom,
        quantity: item.quantite,
        price: parseFloat(item.prix_unitaire),
        total: parseFloat(item.prix_total)
      })),
      client: {
        name: `${order.client.first_name} ${order.client.last_name}`,
        phone: order.client.phone_number,
        address: order.client.address
      }
    };

    const restaurantInfo = {
      id: order.restaurant.id,
      name: order.restaurant.name,
      address: order.restaurant.address,
      phone: order.restaurant.phone || 'Non renseigné',
      email: order.restaurant.email || 'Non renseigné'
    };

    const message = `⚠️ Commande #${order.order_number} sans réponse depuis 3 minutes.\n` +
                    `Restaurant: ${order.restaurant.name}\n` +
                    `Montant: ${order.total_amount} DA\n` +
                    `📞 Contact restaurant: ${restaurantInfo.phone}`;

    // Créer la notification en BDD
    const notification = await AdminNotification.create({
      order_id: orderId,
      restaurant_id: order.restaurant_id,
      type: 'pending_order_timeout',
      message,
      order_details: orderDetails,
      restaurant_info: restaurantInfo
    });

    console.log(`🔔 Admin notification created: ${notification.id}`);

    // Envoyer via Socket.IO à tous les admins
    emit('admin', 'new_notification', {
      id: notification.id,
      type: 'pending_order_timeout',
      message,
      order: orderDetails,
      restaurant: restaurantInfo,
      created_at: notification.created_at
    });

    return notification;

  } catch (error) {
    console.error('❌ Error creating admin notification:', error);
    return null;
  }
};


/**
 * Créer une notification admin pour commande non répondue
 */
export const createAcceptedOrderNotification = async (orderId) => {
  try {
    // Récupérer toutes les infos de la commande
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address']
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'phone_number', 'address']
        },
        {
          model: OrderItem,
          as: 'order_items',
          include: [{
            model: MenuItem,
            as: 'menu_item',
            attributes: ['nom', 'prix']
          }]
        }
      ]
    });

    if (!order) {
      console.error(`❌ Order ${orderId} not found for admin notification`);
      return null;
    }

    // Vérifier si encore en accepted
    if (order.status !== 'accepted') {
      console.log(`⚠️ Order ${orderId} no longer accepted, skipping notification`);
      return null;
    }

    // Préparer les données
    const orderDetails = {
      order_number: order.order_number,
      order_type: order.order_type,
      total_amount: parseFloat(order.total_amount || 0),
      delivery_address: order.delivery_address,
      created_at: order.created_at,
      items: order.order_items.map(item => ({
        name: item.menu_item.nom,
        quantity: item.quantite,
        price: parseFloat(item.prix_unitaire),
        total: parseFloat(item.prix_total)
      })),
      client: {
        name: `${order.client.first_name} ${order.client.last_name}`,
        phone: order.client.phone_number,
        address: order.client.address
      }
    };

    const restaurantInfo = {
      id: order.restaurant.id,
      name: order.restaurant.name,
      address: order.restaurant.address,
      phone: order.restaurant.phone || 'Non renseigné',
      email: order.restaurant.email || 'Non renseigné'
    };

    const message = `⚠️ Commande #${order.order_number} sans réponse depuis 3 minutes.\n` +
                    `Restaurant: ${order.restaurant.name}\n` +
                    `Montant: ${order.total_amount} DA\n` +
                    `📞 Contact restaurant: ${restaurantInfo.phone}`;

    // Créer la notification en BDD
    const notification = await AdminNotification.create({
      order_id: orderId,
      restaurant_id: order.restaurant_id,
      type: 'assigned_order_timeout',
      message,
      order_details: orderDetails,
      restaurant_info: restaurantInfo
    });

    console.log(`🔔 Admin notification created: ${notification.id}`);

    // Envoyer via Socket.IO à tous les admins
    emit('admin', 'new_notification', {
      id: notification.id,
      type: 'assigned_order_timeout',
      message,
      order: orderDetails,
      restaurant: restaurantInfo,
      created_at: notification.created_at
    });

    return notification;

  } catch (error) {
    console.error('❌ Error creating admin notification:', error);
    return null;
  }
};
/**
 * Récupérer toutes les notifications (avec filtres)
 */
export const getAllNotifications = async (filters = {}) => {
  const where = {};
  
  if (filters.is_read !== undefined) {
    where.is_read = filters.is_read;
  }
  
  if (filters.is_resolved !== undefined) {
    where.is_resolved = filters.is_resolved;
  }
  
  if (filters.type) {
    where.type = filters.type;
  }

  return AdminNotification.findAll({
    where,
    include: [
      { model: Order, as: 'order' },
      { model: Restaurant, as: 'restaurant' }
    ],
    order: [['created_at', 'DESC']]
  });
};

/**
 * Marquer comme lu
 */
export const markAsRead = async (notificationId) => {
  const notification = await AdminNotification.findByPk(notificationId);
  if (!notification) return null;
  
  await notification.update({ is_read: true });
  return notification;
};

/**
 * Résoudre une notification
 */
export const resolveNotification = async (notificationId, adminId, action, notes) => {
  const notification = await AdminNotification.findByPk(notificationId);
  if (!notification) {
    throw { status: 404, message: "Notification not found" };
  }

  await notification.update({
    is_resolved: true,
    resolved_by: adminId,
    resolved_at: new Date(),
    admin_action: action,
    admin_notes: notes
  });

  return notification;
};

export default {
  createPendingOrderNotification,
  getAllNotifications,
  markAsRead,
  resolveNotification
};