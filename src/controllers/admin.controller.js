import * as adminNotificationService from "../services/adminNotification.service.js";
import Order from "../models/Order.js";
import Admin from "../models/Admin.js";

/**
 * GET /admin/notifications
 * Récupérer toutes les notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const filters = {
      is_read: req.query.is_read === 'true' ? true : req.query.is_read === 'false' ? false : undefined,
      is_resolved: req.query.is_resolved === 'true' ? true : req.query.is_resolved === 'false' ? false : undefined,
      type: req.query.type
    };

    const notifications = await adminNotificationService.getAllNotifications(filters);

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/notifications/:id/read
 * Marquer comme lu
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await adminNotificationService.markAsRead(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/notifications/:id/resolve
 * Résoudre une notification avec action
 */
export const resolveNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    
    // Get admin ID from JWT (admin_id should be in token)
    const adminId = req.user.admin_id;
    
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin profile not found in token"
      });
    }

    const notification = await adminNotificationService.resolveNotification(
      id, 
      adminId, 
      action, 
      notes
    );

    res.json({
      success: true,
      message: "Notification resolved",
      data: notification
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

/**
 * POST /admin/orders/:id/force-accept
 * Forcer l'acceptation d'une commande
 */
export const forceAcceptOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { preparation_time = 20 } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot force accept order in ${order.status} status`
      });
    }

    // Force accept
    await order.update({
      status: 'accepted',
      preparation_time,
      accepted_at: new Date()
    });

    res.json({
      success: true,
      message: "Order forcefully accepted by admin",
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/orders/:id/force-cancel
 * Annuler une commande (admin)
 */
export const forceCancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required"
      });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    await order.update({
      status: 'declined',
      decline_reason: `[ADMIN] ${reason}`
    });

    res.json({
      success: true,
      message: "Order cancelled by admin",
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/profile/me
 * Récupérer le profil de l'admin connecté
 */
export const getProfile = async (req, res, next) => {
  try {
    const adminId = req.user.admin_id;
    
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin profile not found in token"
      });
    }

    const admin = await Admin.findByPk(adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found"
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (err) {
    next(err);
  }
};