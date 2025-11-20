import * as adminNotificationService from "../services/adminNotification.service.js";
import Order from "../models/Order.js";
import Admin from "../models/Admin.js";
import Driver from "../models/Driver.js";
import { 
  getMaxOrdersPerDriver, 
  updateMaxOrdersPerDriver 
} from '../services/multiDeliveryService.js';
import SystemConfig from '../models/SystemConfig.js';
import { emit } from '../config/socket.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';


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


/**
 * GET /admin/config/delivery
 * Récupérer la configuration de livraison
 */
export const getDeliveryConfig = async (req, res, next) => {
  try {
    const maxOrders = await getMaxOrdersPerDriver();
    const maxDistance = await SystemConfig.get('max_distance_between_restaurants', 500);

    res.json({
      success: true,
      data: {
        max_orders_per_driver: maxOrders,
        max_distance_between_restaurants: maxDistance
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /admin/config/delivery/max-orders
 * Mettre à jour le nombre max de commandes par livreur
 */
export const updateMaxOrders = async (req, res, next) => {
  try {
    const { max_orders } = req.body;
    const adminId = req.user.admin_id;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin profile not found in token"
      });
    }

    if (!max_orders || max_orders < 1 || max_orders > 10) {
      return res.status(400).json({
        success: false,
        message: "max_orders must be between 1 and 10"
      });
    }

    const config = await updateMaxOrdersPerDriver(max_orders, adminId);

    // 🔔 Notifier TOUS les livreurs de la nouvelle capacité
    emit('drivers', 'config_update', {
      type: 'max_orders_updated',
      max_orders_per_driver: max_orders,
      message: `Maximum orders capacity updated to ${max_orders}`,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Max orders per driver updated to ${max_orders} by admin ${adminId}`);

    res.json({
      success: true,
      message: `Max orders per driver updated to ${max_orders}. All drivers notified.`,
      data: {
        max_orders_per_driver: max_orders,
        updated_at: config.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /admin/config/delivery/max-distance
 * Mettre à jour la distance max entre restaurants
 */
export const updateMaxDistance = async (req, res, next) => {
  try {
    const { max_distance } = req.body;
    const adminId = req.user.admin_id;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin profile not found in token"
      });
    }

    if (!max_distance || max_distance < 100 || max_distance > 5000) {
      return res.status(400).json({
        success: false,
        message: "max_distance must be between 100 and 5000 meters"
      });
    }

    const config = await SystemConfig.set(
      'max_distance_between_restaurants',
      max_distance,
      adminId,
      'Maximum distance between restaurants for multi-delivery'
    );

    console.log(`✅ Max distance between restaurants updated to ${max_distance}m by admin ${adminId}`);

    res.json({
      success: true,
      message: `Max distance between restaurants updated to ${max_distance}m`,
      data: {
        max_distance_between_restaurants: max_distance,
        updated_at: config.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
};


// Add to src/controllers/admin.controller.js

export const getAllAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.findAll({
      order: [['created_at', 'DESC']],
      attributes: { exclude: [] }
    });

    res.json({
      success: true,
      data: admins
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, role_level, is_active } = req.body;

    const admin = await Admin.findByPk(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    await admin.update({
      first_name,
      last_name,
      email,
      phone,
      role_level,
      is_active
    });

    res.json({
      success: true,
      message: "Admin updated successfully",
      data: admin
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const admin = await Admin.findByPk(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    await admin.destroy();

    res.json({
      success: true,
      message: "Admin deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};


export const createAdmin = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, password, role_level, is_active } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé"
      });
    }

    // Create user account
    const user = await User.create({
      email,
      password, // Will be hashed by the model hook
      role: 'admin',
      is_active: is_active ?? true
    });

    // Create admin profile
    const admin = await Admin.create({
      user_id: user.id,
      first_name,
      last_name,
      email,
      phone: phone || null,
      role_level: role_level || 'admin',
      is_active: is_active ?? true
    });

    res.status(201).json({
      success: true,
      message: "Administrateur créé avec succès",
      data: admin
    });
  } catch (err) {
    next(err);
  }
};



// À ajouter dans src/controllers/admin.controller.js

/**
 * GET /admin/favorites/restaurants
 * Récupérer tous les restaurants favoris (vue admin)
 */
export const getAllFavoriteRestaurants = async (req, res, next) => {
  try {
    const { client_id, search, page = 1, limit = 20 } = req.query;
    
    const where = client_id ? { client_id } : {};
    
    const FavoriteRestaurant = (await import('../models/FavoriteRestaurant.js')).default;
    const Restaurant = (await import('../models/Restaurant.js')).default;
    const Client = (await import('../models/Client.js')).default;
    
    const favorites = await FavoriteRestaurant.findAll({
      where,
      include: [
        { 
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['id', 'name', 'description', 'address', 'rating', 'image_url', 'is_premium', 'status']
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone_number']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/favorites/meals
 * Récupérer tous les plats favoris (vue admin)
 */
export const getAllFavoriteMeals = async (req, res, next) => {
  try {
    const { client_id, search, page = 1, limit = 20 } = req.query;
    
    const where = client_id ? { client_id } : {};
    
    const FavoriteMeal = (await import('../models/FavoriteMeal.js')).default;
    const MenuItem = (await import('../models/MenuItem.js')).default;
    const Restaurant = (await import('../models/Restaurant.js')).default;
    const Client = (await import('../models/Client.js')).default;
    
    const favorites = await FavoriteMeal.findAll({
      where,
      include: [
        { 
          model: MenuItem, 
          as: 'meal',
          attributes: ['id', 'nom', 'description', 'prix', 'photo_url', 'category_id'],
          include: [
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name', 'address', 'rating', 'image_url']
            }
          ]
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone_number']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/favorites/stats
 * Récupérer les statistiques des favoris
 */
export const getFavoritesStats = async (req, res, next) => {
  try {
    const FavoriteRestaurant = (await import('../models/FavoriteRestaurant.js')).default;
    const FavoriteMeal = (await import('../models/FavoriteMeal.js')).default;
    
    const [restaurantCount, mealCount] = await Promise.all([
      FavoriteRestaurant.count(),
      FavoriteMeal.count()
    ]);
    
    res.json({
      success: true,
      data: {
        total_favorite_restaurants: restaurantCount,
        total_favorite_meals: mealCount,
        total_favorites: restaurantCount + mealCount
      }
    });
  } catch (err) {
    next(err);
  }
};



// Add to src/controllers/admin.controller.js

/**
 * POST /admin/notify/drivers
 * Broadcast a notification to ALL drivers
 */
export const notifyAllDrivers = async (req, res, next) => {
  try {
    const { message, title, type = 'info', data = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    // Get all active drivers
    const Driver = (await import('../models/Driver.js')).default;
    const drivers = await Driver.findAll({
      where: {
        is_active: true,
        status: ['available', 'busy'] // Only notify active/working drivers
      },
      attributes: ['id', 'first_name', 'last_name', 'status']
    });

    // Broadcast notification via Socket.IO
    const { emit } = await import('../config/socket.js');
    
    const notificationPayload = {
      type: type,
      title: title || 'Admin Notification',
      message: message,
      timestamp: new Date().toISOString(),
      ...data
    };

    // Send to all drivers room
    emit('drivers', 'admin_broadcast', notificationPayload);

    // Also send to individual driver rooms for reliability
    drivers.forEach(driver => {
      emit(`driver:${driver.id}`, 'admin_broadcast', notificationPayload);
    });

    console.log(`✅ Broadcast notification sent to ${drivers.length} drivers`);

    res.json({
      success: true,
      message: `Notification sent to ${drivers.length} drivers`,
      data: {
        recipients_count: drivers.length,
        notification: notificationPayload
      }
    });
  } catch (err) {
    next(err);
  }
};