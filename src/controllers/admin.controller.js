import * as adminNotificationService from "../services/adminNotification.service.js";
import Order from "../models/Order.js";
import Admin from "../models/Admin.js";
import Driver from "../models/Driver.js";


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

/**
 * GET /admin/drivers/:id/cancellations
 * Récupérer l'historique des annulations d'un livreur
 */
export const getDriverCancellations = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const driver = await Driver.findByPk(id, {
      attributes: [
        'id', 
        'driver_code', 
        'first_name', 
        'last_name', 
        'phone', 
        'email',
        'cancellation_count',
        'total_deliveries',
        'rating',
        'status',
        'is_active',
        'created_at'
      ]
    });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    // Récupérer toutes les commandes annulées par ce livreur
    const cancelledOrders = await Order.findAll({
      where: {
        decline_reason: {
          [Op.like]: '[DRIVER CANCELLED]%'
        }
      },
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'address']
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'phone_number']
        }
      ],
      order: [['updated_at', 'DESC']],
      limit: 50
    });

    // Statistiques
    const stats = {
      total_cancellations: driver.cancellation_count,
      total_deliveries: driver.total_deliveries,
      cancellation_rate: driver.total_deliveries > 0 
        ? ((driver.cancellation_count / (driver.total_deliveries + driver.cancellation_count)) * 100).toFixed(2)
        : 0,
      current_status: driver.status,
      is_active: driver.is_active,
      rating: driver.rating
    };

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          driver_code: driver.driver_code,
          name: driver.getFullName(),
          phone: driver.phone,
          email: driver.email
        },
        stats,
        cancelled_orders: cancelledOrders.map(order => ({
          id: order.id,
          order_number: order.order_number,
          restaurant: order.restaurant.name,
          client_name: `${order.client.first_name} ${order.client.last_name}`,
          reason: order.decline_reason.replace('[DRIVER CANCELLED] ', ''),
          cancelled_at: order.updated_at,
          order_value: parseFloat(order.total_amount || 0)
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/drivers/:id/reset-cancellations
 * Réinitialiser le compteur d'annulations d'un livreur
 */
export const resetDriverCancellations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const driver = await Driver.findByPk(id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const previousCount = driver.cancellation_count;
    
    await driver.update({
      cancellation_count: 0,
      notes: notes 
        ? `${driver.notes || ''}\n[${new Date().toISOString()}] Annulations réinitialisées (${previousCount}): ${notes}`
        : driver.notes
    });

    console.log(`✅ Admin reset cancellation count for driver ${driver.driver_code} (was ${previousCount})`);

    res.json({
      success: true,
      message: "Cancellation count reset successfully",
      data: {
        driver_id: driver.id,
        driver_code: driver.driver_code,
        previous_count: previousCount,
        new_count: 0
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/drivers/:id/suspend
 * Suspendre un livreur
 */
export const suspendDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, duration_days } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Suspension reason is required"
      });
    }

    const driver = await Driver.findByPk(id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    // Calculer la date de fin de suspension si durée fournie
    let suspensionNote = `[${new Date().toISOString()}] SUSPENDU: ${reason}`;
    if (duration_days) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(duration_days));
      suspensionNote += ` (jusqu'au ${endDate.toLocaleDateString()})`;
    }

    await driver.update({
      status: 'suspended',
      is_active: false,
      notes: `${driver.notes || ''}\n${suspensionNote}`
    });

    console.log(`🚫 Admin suspended driver ${driver.driver_code}: ${reason}`);

    res.json({
      success: true,
      message: "Driver suspended successfully",
      data: {
        driver_id: driver.id,
        driver_code: driver.driver_code,
        status: driver.status,
        reason: reason,
        duration_days: duration_days || 'Indefinite'
      }
    });
  } catch (err) {
    next(err);
  }
};