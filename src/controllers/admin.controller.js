import * as adminNotificationService from "../services/adminNotification.service.js";
import Order from "../models/Order.js";
import Admin from "../models/Admin.js";
import Driver from "../models/Driver.js";
import Client from "../models/Client.js";
import Restaurant from "../models/Restaurant.js";
import AdminNotification from "../models/AdminNotification.js";
import Announcement from "../models/Announcement.js";
import { 
  getMaxOrdersPerDriver, 
  updateMaxOrdersPerDriver 
} from '../services/multiDeliveryService.js';
import SystemConfig from '../models/SystemConfig.js';
import { emit, getOnlineCounts } from '../config/socket.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";
import { Op, Sequelize } from "sequelize";
import * as topRatedService from "../services/topRated.service.js";
import cacheService from '../services/cache.service.js';
import { cacheHelpers } from '../middlewares/cache.middleware.js';
import os from 'os';
import { sequelize } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import * as adminHomepageService from '../services/adminHomepage.service.js';

const DEFAULT_CLIENT_LAT = 36.75;
const DEFAULT_CLIENT_LNG = 3.05;

const normalizeCategoriesParam = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
};

const parseNumber = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const swaggerApiCache = {
  endpoints: null,
  lastLoad: 0
};

const getAllApiDefinitions = () => {
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  if (swaggerApiCache.endpoints && Date.now() - swaggerApiCache.lastLoad < CACHE_TTL) {
    return swaggerApiCache.endpoints;
  }

  try {
    const swaggerPath = path.resolve(process.cwd(), 'swagger-output.json');
    const swaggerRaw = fs.readFileSync(swaggerPath, 'utf8');
    const swaggerJson = JSON.parse(swaggerRaw);
    const paths = swaggerJson.paths || {};

    const endpoints = [];
    Object.entries(paths).forEach(([route, methods]) => {
      Object.entries(methods || {}).forEach(([method, meta]) => {
        endpoints.push({
          path: route,
          method: method.toUpperCase(),
          summary: meta?.summary || meta?.description || ''
        });
      });
    });

    swaggerApiCache.endpoints = endpoints;
    swaggerApiCache.lastLoad = Date.now();
    return endpoints;
  } catch (error) {
    console.error('Monitoring: failed to load swagger-output.json', error.message);
    swaggerApiCache.endpoints = [];
    swaggerApiCache.lastLoad = Date.now();
    return [];
  }
};


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

export const getHomepageSnapshot = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.menu_item_limit, 10);
    const nearbyFilters = {
      lat: parseNumber(req.query.lat, DEFAULT_CLIENT_LAT),
      lng: parseNumber(req.query.lng, DEFAULT_CLIENT_LNG),
      radius: parseNumber(req.query.radius, 5000),
      q: req.query.q,
      categories: normalizeCategoriesParam(req.query.categories),
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 20
    };

    const payload = await adminHomepageService.getAdminHomepageSnapshot({
      menuItemLimit: Number.isNaN(limit) ? 200 : limit,
      nearbyFilters
    });

    res.json({
      success: true,
      data: payload
    });
  } catch (err) {
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
 * PUT /admin/profile/me
 * Mettre à jour le profil de l'admin connecté
 */
export const updateProfile = async (req, res, next) => {
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

    const { first_name, last_name, email, phone } = req.body;

    // Validation
    if (first_name && first_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Le prénom doit contenir au moins 2 caractères"
      });
    }

    if (last_name && last_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Le nom doit contenir au moins 2 caractères"
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Format d'email invalide"
        });
      }
    }

    // Mettre à jour les champs fournis
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name.trim();
    if (last_name !== undefined) updateData.last_name = last_name.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

    await admin.update(updateData);

    // Recharger l'admin pour avoir les données à jour
    await admin.reload();

    res.json({
      success: true,
      message: "Profil mis à jour avec succès",
      data: admin
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé",
        field: err.errors[0]?.path || 'email'
      });
    }

    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

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
 * GET /admin/config/all
 * Récupérer toutes les configurations système (cached for 5 minutes)
 */
export const getAllConfigs = async (req, res, next) => {
  try {
    const cacheKey = 'admin:configs:all';
    
    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return res.json({
        success: true,
        ...cached,
        cached: true
      });
    }

    const allConfigs = await SystemConfig.findAll({
      order: [['config_key', 'ASC']]
    });

    // Organiser par catégories
    const configsByCategory = {
      delivery: [],
      orders: [],
      fees: [],
      notifications: [],
      drivers: [],
      platform: []
    };

    allConfigs.forEach(config => {
      const key = config.config_key;
      const value = config.config_value;
      const description = config.description || '';
      
      const configItem = {
        key,
        value,
        description,
        updated_at: config.updated_at,
        updated_by: config.updated_by
      };

      // Catégoriser les configurations (ordre important pour éviter les doublons)
      if (key.includes('max_orders') || key.includes('max_distance') || key.includes('search_radius') || key.includes('delivery_distance')) {
        configsByCategory.delivery.push(configItem);
      } else if (key.includes('preparation_time') || (key.includes('timeout') && !key.includes('notification'))) {
        configsByCategory.orders.push(configItem);
      } else if (key.includes('fee') || key.includes('commission')) {
        configsByCategory.fees.push(configItem);
      } else if (key.includes('notification')) {
        configsByCategory.notifications.push(configItem);
      } else if (key.includes('driver') || key.includes('cancellation')) {
        configsByCategory.drivers.push(configItem);
      } else {
        configsByCategory.platform.push(configItem);
      }
    });

    const response = {
      success: true,
      data: configsByCategory,
      all: allConfigs.map(c => ({
        key: c.config_key,
        value: c.config_value,
        description: c.description,
        updated_at: c.updated_at,
        updated_by: c.updated_by
      }))
    };

    // Cache for 5 minutes (300 seconds)
    await cacheService.set(cacheKey, response, 300);

    res.json({
      ...response,
      cached: false
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /admin/config/:key
 * Mettre à jour une configuration
 */
export const updateConfig = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const adminId = req.user.admin_id;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin profile not found in token"
      });
    }

    if (value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        message: "Value is required"
      });
    }

    // Validation spécifique selon la clé
    const validations = {
      'max_orders_per_driver': { min: 1, max: 10, type: 'number' },
      'max_distance_between_restaurants': { min: 100, max: 5000, type: 'number' },
      'driver_search_radius': { min: 1000, max: 20000, type: 'number' },
      'pending_order_timeout': { min: 1, max: 60, type: 'number' },
      'default_delivery_fee': { min: 0, max: 10000, type: 'number' },
      'delivery_fee_per_km': { min: 0, max: 1000, type: 'number' },
      'max_delivery_distance': { min: 1, max: 100, type: 'number' },
      'default_preparation_time': { min: 5, max: 120, type: 'number' },
      'platform_commission_rate': { min: 0, max: 50, type: 'number' },
      'max_driver_cancellations': { min: 1, max: 20, type: 'number' }
    };

    const validation = validations[key];
    if (validation) {
      if (validation.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return res.status(400).json({
            success: false,
            message: `${key} must be a number`
          });
        }
        if (validation.min !== undefined && numValue < validation.min) {
          return res.status(400).json({
            success: false,
            message: `${key} must be at least ${validation.min}`
          });
        }
        if (validation.max !== undefined && numValue > validation.max) {
          return res.status(400).json({
            success: false,
            message: `${key} must be at most ${validation.max}`
          });
        }
      }
    }

    // Mise à jour spéciale pour max_orders_per_driver
    if (key === 'max_orders_per_driver') {
      const config = await updateMaxOrdersPerDriver(Number(value), adminId);
      
      // Notifier tous les livreurs
      emit('drivers', 'config_update', {
        type: 'max_orders_updated',
        max_orders_per_driver: Number(value),
        message: `Maximum orders capacity updated to ${value}`,
        timestamp: new Date().toISOString()
      });

      return res.json({
        success: true,
        message: `Max orders per driver updated to ${value}. All drivers notified.`,
        data: {
          key,
          value: Number(value),
          updated_at: config.updated_at
        }
      });
    }

    // Mise à jour standard
    const config = await SystemConfig.set(
      key,
      validation?.type === 'number' ? Number(value) : value,
      adminId,
      description
    );

    // Invalidate config cache
    await cacheService.del('admin:configs:all');
    await cacheService.del(`admin:config:${key}`);

    console.log(`✅ Config ${key} updated to ${value} by admin ${adminId}`);

    res.json({
      success: true,
      message: `Configuration ${key} updated successfully`,
      data: {
        key,
        value: config.config_value,
        description: config.description,
        updated_at: config.updated_at
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
    let { first_name, last_name, email, phone, role_level, is_active } = req.body;

    // Normaliser le numéro de téléphone
    if (phone) {
      phone = normalizePhoneNumber(phone);
    }

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
    let { first_name, last_name, email, phone, password, role_level, is_active } = req.body;

    // Normaliser le numéro de téléphone
    if (phone) {
      phone = normalizePhoneNumber(phone);
    }

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
          attributes: ['id', 'name', 'description', 'address', 'rating', 'image_url', 'is_premium', 'status', 'email']
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
 * GET /admin/statistics
 * Get dashboard statistics for admin (cached for 2 minutes)
 */
export const getStatistics = async (req, res, next) => {
  try {
    const cacheKey = 'admin:statistics';
    
    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      const online = getOnlineCounts();
      return res.json({
        success: true,
        data: { ...cached, online },
        cached: true
      });
    }

    // Get all orders (needed for dashboard totals + timing analytics)
    const orders = await Order.findAll({
      attributes: [
        'id',
        'status',
        'order_type',
        'total_amount',
        'created_at',
        'accepted_at',
        'preparing_started_at',
        'assigned_at',
        'delivering_started_at',
        'delivered_at'
      ]
    });

    // Calculate order statistics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'declined').length;
    const inProgressOrders = orders.filter(o => 
      ['accepted', 'preparing', 'assigned', 'delivering', 'arrived'].includes(o.status)
    ).length;

    // Calculate revenue
    const totalRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    const avgOrderValue = completedOrders > 0 
      ? totalRevenue / completedOrders 
      : 0;

    // ====================
    // Order pipeline timing (avg time between steps)
    // ====================
    const pipelinePeriodDays = 7;
    const pipelineSince = new Date(Date.now() - pipelinePeriodDays * 24 * 60 * 60 * 1000);
    const deliveredRecent = orders.filter((o) => {
      if (o.status !== 'delivered') return false;
      if (!o.created_at) return false;
      return new Date(o.created_at) >= pipelineSince;
    });

    const durations = {
      pending_to_accepted: [],
      accepted_to_preparing: [],
      preparing_to_assigned: [],
      assigned_to_delivering: [],
      delivering_to_delivered: [],
      created_to_delivered: []
    };

    const pushDuration = (arr, fromDate, toDate) => {
      if (!fromDate || !toDate) return;
      const fromMs = new Date(fromDate).getTime();
      const toMs = new Date(toDate).getTime();
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return;
      const diff = toMs - fromMs;
      if (diff < 0) return;
      arr.push(diff);
    };

    deliveredRecent.forEach((order) => {
      pushDuration(durations.pending_to_accepted, order.created_at, order.accepted_at);
      pushDuration(durations.accepted_to_preparing, order.accepted_at, order.preparing_started_at);
      pushDuration(durations.preparing_to_assigned, order.preparing_started_at, order.assigned_at);
      pushDuration(durations.assigned_to_delivering, order.assigned_at, order.delivering_started_at);
      pushDuration(durations.delivering_to_delivered, order.delivering_started_at, order.delivered_at);
      pushDuration(durations.created_to_delivered, order.created_at, order.delivered_at);
    });

    const averageMs = (arr) =>
      arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;

    const toMinutes = (ms) => Number((ms / 60000).toFixed(1));

    const pipeline = {
      period_days: pipelinePeriodDays,
      sample_size: deliveredRecent.length,
      total_avg_minutes: toMinutes(averageMs(durations.created_to_delivered)),
      steps: [
        {
          key: 'pending_to_accepted',
          label: "Validation → Acceptation",
          avg_minutes: toMinutes(averageMs(durations.pending_to_accepted)),
          samples: durations.pending_to_accepted.length
        },
        {
          key: 'accepted_to_preparing',
          label: "Acceptation → Préparation",
          avg_minutes: toMinutes(averageMs(durations.accepted_to_preparing)),
          samples: durations.accepted_to_preparing.length
        },
        {
          key: 'preparing_to_assigned',
          label: "Préparation → Assignation",
          avg_minutes: toMinutes(averageMs(durations.preparing_to_assigned)),
          samples: durations.preparing_to_assigned.length
        },
        {
          key: 'assigned_to_delivering',
          label: "Assignation → Départ",
          avg_minutes: toMinutes(averageMs(durations.assigned_to_delivering)),
          samples: durations.assigned_to_delivering.length
        },
        {
          key: 'delivering_to_delivered',
          label: "Départ → Livré",
          avg_minutes: toMinutes(averageMs(durations.delivering_to_delivered)),
          samples: durations.delivering_to_delivered.length
        }
      ]
    };

    // Get restaurant statistics
    const restaurants = await Restaurant.findAll({
      attributes: ['id', 'is_active', 'is_premium', 'status']
    });
    const totalRestaurants = restaurants.length;
    const activeRestaurants = restaurants.filter(r => r.is_active).length;
    const premiumRestaurants = restaurants.filter(r => r.is_premium).length;
    const approvedRestaurants = restaurants.filter(r => r.status === 'approved').length;

    // Get driver statistics
    const drivers = await Driver.findAll({
      attributes: ['id', 'status', 'is_active', 'is_verified']
    });
    const totalDrivers = drivers.length;
    const availableDrivers = drivers.filter(d => d.status === 'available').length;
    const busyDrivers = drivers.filter(d => d.status === 'busy').length;
    const offlineDrivers = drivers.filter(d => d.status === 'offline').length;

    // Get client statistics
    const clients = await Client.findAll({
      attributes: ['id', 'is_active', 'is_verified']
    });
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.is_active).length;
    const verifiedClients = clients.filter(c => c.is_verified).length;

    // Get notification statistics
    const notifications = await AdminNotification.findAll({
      attributes: ['id', 'is_read', 'is_resolved', 'type', 'created_at']
    });
    const notificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      unresolved: notifications.filter(n => !n.is_resolved).length,
      resolved: notifications.filter(n => n.is_resolved).length
    };

    // Calculate growth (compare with previous month - simplified for now)
    // In a real implementation, you'd compare with previous period
    const orderGrowth = 12.5; // Mock value - should be calculated from historical data
    const revenueGrowth = 18.3; // Mock value - should be calculated from historical data

    const statistics = {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        inProgress: inProgressOrders,
        growth: orderGrowth
      },
      revenue: {
        total: parseFloat(totalRevenue.toFixed(2)),
        average: parseFloat(avgOrderValue.toFixed(2)),
        growth: revenueGrowth
      },
      restaurants: {
        total: totalRestaurants,
        active: activeRestaurants,
        premium: premiumRestaurants,
        approved: approvedRestaurants
      },
      drivers: {
        total: totalDrivers,
        available: availableDrivers,
        busy: busyDrivers,
        offline: offlineDrivers
      },
      clients: {
        total: totalClients,
        active: activeClients,
        verified: verifiedClients
      },
      notifications: notificationStats,
      pipeline
    };

    // Cache for 2 minutes (120 seconds)
    await cacheService.set(cacheKey, statistics, 120);

    const online = getOnlineCounts();
    res.json({
      success: true,
      data: { ...statistics, online },
      cached: false
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/monitoring
 * System and API monitoring snapshot
 */
export const getMonitoringSnapshot = async (req, res, next) => {
  try {
    const cacheKey = 'admin:monitoring:snapshot';
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since15m = new Date(now.getTime() - 15 * 60 * 1000);

    const dbCheckStarted = Date.now();
    let dbStatus = 'healthy';
    try {
      await sequelize.query('SELECT 1');
    } catch (error) {
      console.error('Monitoring DB ping failed:', error.message);
      dbStatus = 'error';
    }
    const dbLatency = Math.max(1, Date.now() - dbCheckStarted);

    const [
      orders24h,
      activeOrders,
      ordersLast15m,
      onlineDrivers,
      activeRestaurants,
      approvedRestaurants
    ] = await Promise.all([
      Order.findAll({
        attributes: [
          'id',
          'status',
          'created_at',
          'accepted_at',
          'assigned_at',
          'delivering_started_at',
          'delivered_at',
          'total_amount'
        ],
        where: { created_at: { [Op.gte]: since24h } },
        order: [['created_at', 'DESC']]
      }),
      Order.count({ where: { status: { [Op.notIn]: ['delivered', 'declined'] } } }),
      Order.count({ where: { created_at: { [Op.gte]: since15m } } }),
      Driver.count({ where: { status: { [Op.in]: ['available', 'busy'] } } }),
      Restaurant.count({ where: { is_active: true } }),
      Restaurant.count({ where: { is_active: true, status: 'approved' } })
    ]);

    const declinedOrders = orders24h.filter(o => o.status === 'declined').length;
    const deliveredOrders = orders24h.filter(o => o.status === 'delivered').length;
    const acceptedOrders = orders24h.filter(o => 
      ['accepted', 'preparing', 'assigned', 'arrived', 'delivering', 'delivered'].includes(o.status)
    ).length;
    const assignedOrders = orders24h.filter(o => !!o.assigned_at).length;
    const deliveringOrders = orders24h.filter(o => !!o.delivering_started_at).length;

    const acceptanceDurations = [];
    const deliveryDurations = [];

    orders24h.forEach(order => {
      const createdAt = order.created_at ? new Date(order.created_at).getTime() : null;
      if (createdAt && order.accepted_at) {
        acceptanceDurations.push(new Date(order.accepted_at).getTime() - createdAt);
      }
      if (order.delivering_started_at && order.delivered_at) {
        deliveryDurations.push(
          new Date(order.delivered_at).getTime() - new Date(order.delivering_started_at).getTime()
        );
      }
    });

    const average = (arr) => arr.length
      ? arr.reduce((sum, val) => sum + val, 0) / arr.length
      : 0;

    const buildEndpointMetric = (name, calls, errors, avgTime, lastTime) => {
      const safeCalls = Math.max(calls, 0);
      const safeErrors = Math.max(errors, 0);
      const successRate = safeCalls === 0
        ? 100
        : Number(((1 - safeErrors / safeCalls) * 100).toFixed(1));
      const status = dbStatus === 'error'
        ? 'error'
        : successRate < 90
          ? 'error'
          : successRate < 97 || (lastTime || avgTime) > 900
            ? 'warning'
            : 'healthy';

      return {
        name,
        status,
        avgTime: Math.round(Math.max(50, avgTime)),
        lastTime: Math.round(Math.max(50, lastTime || avgTime)),
        successRate,
        calls24h: safeCalls,
        errors24h: safeErrors
      };
    };

    const baseLatency = Math.max(90, dbLatency + 80);
    const acceptanceAvg = average(acceptanceDurations) || baseLatency + 120;
    const deliveryAvg = average(deliveryDurations) || baseLatency + 160;

    const endpoints = [
      buildEndpointMetric(
        'POST /order/create',
        orders24h.length,
        declinedOrders,
        baseLatency + 60,
        baseLatency + (orders24h.length % 60)
      ),
      buildEndpointMetric(
        'GET /order/:id',
        Math.max(orders24h.length * 2, orders24h.length),
        0,
        baseLatency + 45,
        baseLatency + 30
      ),
      buildEndpointMetric(
        'POST /order/:id/accept',
        acceptedOrders,
        Math.max(declinedOrders - acceptedOrders, 0),
        acceptanceAvg,
        acceptanceAvg * 0.9
      ),
      buildEndpointMetric(
        'POST /order/:id/assign-driver',
        assignedOrders,
        Math.max(acceptedOrders - assignedOrders, 0),
        baseLatency + 90,
        baseLatency + 120
      ),
      buildEndpointMetric(
        'PUT /drivers/:id/gps',
        Math.max(onlineDrivers * 12, deliveringOrders * 8, 0),
        0,
        baseLatency + 30,
        baseLatency + 20
      ),
      buildEndpointMetric(
        'GET /order/:id/tracking',
        Math.max(activeOrders * 4, deliveringOrders * 6, 0),
        0,
        baseLatency + 55,
        baseLatency + 40
      ),
      buildEndpointMetric(
        'POST /order/:id/complete-delivery',
        deliveredOrders,
        0,
        deliveryAvg,
        deliveryAvg * 0.85
      ),
      buildEndpointMetric(
        'POST /restaurant/nearbyfilter',
        Math.max(onlineDrivers * 3, approvedRestaurants * 2, 0),
        0,
        baseLatency + 70,
        baseLatency + 50
      )
    ];

    const announcementRecords = await Announcement.findAll({
      attributes: ['id', 'is_active', 'restaurant_id'],
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name']
      }]
    });
    const totalAnnouncements = announcementRecords.length;
    const activeAnnouncements = announcementRecords.filter(a => a.is_active).length;
    const announcementGroups = new Map();
    announcementRecords.forEach((announcement) => {
      const restaurantRef = announcement.restaurant || null;
      const key = restaurantRef?.id || 'global';
      if (!announcementGroups.has(key)) {
        announcementGroups.set(key, {
          restaurant: restaurantRef ? { id: restaurantRef.id, name: restaurantRef.name } : null,
          total: 0,
          active: 0
        });
      }
      const bucket = announcementGroups.get(key);
      bucket.total += 1;
      if (announcement.is_active) {
        bucket.active += 1;
      }
    });
    const announcementBreakdown = Array.from(announcementGroups.values());
    const announcementSummary = {
      total: totalAnnouncements,
      active: activeAnnouncements,
      breakdown: announcementBreakdown
    };

    const notifications = await AdminNotification.findAll({
      attributes: ['id', 'is_read', 'is_resolved', 'type', 'created_at']
    });
    const notificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      unresolved: notifications.filter(n => !n.is_resolved).length,
      resolved: notifications.filter(n => n.is_resolved).length
    };

    const cpuUsage = process.cpuUsage();
    const cpuPercent = Math.min(
      100,
      ((cpuUsage.user + cpuUsage.system) / 1_000_000) /
      Math.max(process.uptime(), 1) /
      Math.max(os.cpus()?.length || 1, 1) * 100
    );
    const memoryUsage = process.memoryUsage();
    const memoryPercent = Math.min(100, (memoryUsage.rss / os.totalmem()) * 100);

    const cacheStats = cacheService.getStats();
    const cacheHitRate = parseFloat(String(cacheStats.hitRate || '0').replace('%', '')) || 0;

    const pool = sequelize?.connectionManager?.pool;
    const dbConnections = typeof pool?.borrowed === 'number'
      ? pool.borrowed
      : typeof pool?.size === 'number' && typeof pool?.available === 'number'
        ? Math.max(pool.size - pool.available, 0)
        : 0;
    const dbMax = typeof pool?.max === 'number'
      ? pool.max
      : typeof pool?.size === 'number'
        ? pool.size
        : dbConnections + 5;
    const dbPending = typeof pool?.pending === 'number' ? pool.pending : 0;

    const payload = {
      apiHealth: {
        status: dbStatus === 'healthy' && dbLatency < 1200 ? 'healthy' : dbStatus,
        uptime: `${Math.min((process.uptime() / (24 * 60 * 60)) * 100, 100).toFixed(2)}%`,
        lastCheck: now.toISOString(),
        responseTime: dbLatency
      },
      realtimeStats: {
        activeOrders,
        onlineDrivers,
        activeRestaurants,
        requestsPerMinute: Math.max(Math.round(ordersLast15m / 15), 0)
      },
      endpoints,
      systemMetrics: {
        cpu: Math.round(cpuPercent),
        memory: Math.round(memoryPercent),
        database: {
          connections: dbConnections,
          maxConnections: dbMax,
          activeQueries: dbPending,
          avgQueryTime: Math.round(Math.max(dbLatency, 40))
        },
        cache: {
          hitRate: Number(cacheHitRate.toFixed(1)),
          size: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          keys: cacheStats.keys || 0
        }
      },
      notifications: notificationStats,
      announcement_summary: announcementSummary,
      apiCatalog: getAllApiDefinitions(),
      alerts: []
    };

    if (declinedOrders > 0) {
      payload.alerts.push({
        type: 'warning',
        title: 'Commandes déclinées',
        message: `${declinedOrders} commandes refusées sur les dernières 24h`,
        timeAgo: '24h'
      });
    }
    if (dbLatency > 800 || dbStatus !== 'healthy') {
      payload.alerts.push({
        type: dbStatus !== 'healthy' ? 'error' : 'warning',
        title: 'Latence base de données',
        message: `Ping DB à ${dbLatency}ms`,
        timeAgo: 'maintenant'
      });
    }
    if (cacheHitRate < 60) {
      payload.alerts.push({
        type: 'warning',
        title: 'Cache à optimiser',
        message: `Taux de hit à ${cacheHitRate.toFixed(1)}%`,
        timeAgo: 'récemment'
      });
    }

    await cacheService.set(cacheKey, payload, 20);

    res.json({
      success: true,
      data: payload,
      cached: false
    });
  } catch (err) {
    next(err);
  }
};

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

// ==================== TOP RATED ====================

/**
 * GET /admin/top/meals
 * Get top 10 most liked meals (cached for 10 minutes)
 */
export const getTop10Meals = async (req, res, next) => {
  try {
    const cacheKey = 'admin:top:meals';
    
    const topMeals = await cacheHelpers.cacheFunction(
      cacheKey,
      () => topRatedService.getTop10Meals(),
      600 // 10 minutes
    );

    res.json({
      success: true,
      count: topMeals.length,
      data: topMeals,
      cached: await cacheService.has(cacheKey)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/top/restaurants
 * Get top 10 best restaurants (cached for 10 minutes)
 */
export const getTop10Restaurants = async (req, res, next) => {
  try {
    const cacheKey = 'admin:top:restaurants';
    
    const topRestaurants = await cacheHelpers.cacheFunction(
      cacheKey,
      () => topRatedService.getTop10Restaurants(),
      600 // 10 minutes
    );

    res.json({
      success: true,
      count: topRestaurants.length,
      data: topRestaurants,
      cached: await cacheService.has(cacheKey)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/top/drivers
 * Get top 10 best drivers (cached for 10 minutes)
 */
export const getTop10Drivers = async (req, res, next) => {
  try {
    const cacheKey = 'admin:top:drivers';
    
    const topDrivers = await cacheHelpers.cacheFunction(
      cacheKey,
      () => topRatedService.getTop10Drivers(),
      600 // 10 minutes
    );

    res.json({
      success: true,
      count: topDrivers.length,
      data: topDrivers,
      cached: await cacheService.has(cacheKey)
    });
  } catch (err) {
    next(err);
  }
};

// ==================== MAP DATA ====================

/**
 * GET /admin/map/restaurants
 * Get all restaurants with coordinates for map display
 */
export const getMapRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.findAll({
      attributes: [
        'id',
        'name',
        'address',
        'image_url',
        'rating',
        'status',
        'is_active',
        'is_premium',
        'location'
      ],
      where: {
        status: 'approved',
        is_active: true
      }
    });

    const ratingRows = restaurants.length
      ? await Order.findAll({
          attributes: [
            'restaurant_id',
            [Sequelize.fn('COUNT', Sequelize.col('Order.id')), 'rating_count'],
            [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('client_id'))), 'raters_count']
          ],
          where: {
            restaurant_id: { [Op.in]: restaurants.map((restaurant) => restaurant.id) },
            rating: { [Op.not]: null }
          },
          group: ['restaurant_id'],
          raw: true
        })
      : [];

    const ratingMap = new Map(
      ratingRows.map((row) => [
        String(row.restaurant_id),
        {
          rating_count: Number(row.rating_count) || 0,
          raters_count: Number(row.raters_count) || 0
        }
      ])
    );

    const formatted = restaurants.map((r) => {
      const coords = r.location?.coordinates || [];
      const ratingStats = ratingMap.get(String(r.id)) || { rating_count: 0, raters_count: 0 };
      return {
        id: r.id,
        name: r.name,
        address: r.address,
        image_url: r.image_url,
        rating: r.rating ? parseFloat(r.rating) : null,
        rating_count: ratingStats.rating_count,
        raters_count: ratingStats.raters_count,
        is_premium: r.is_premium,
        lat: coords[1] || null,
        lng: coords[0] || null
      };
    }).filter(r => r.lat && r.lng); // Only return restaurants with valid coordinates

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/map/drivers
 * Get all drivers with coordinates for real-time map display
 */
export const getMapDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.findAll({
      attributes: [
        'id',
        'driver_code',
        'first_name',
        'last_name',
        'phone',
        'status',
        'current_location',
        'vehicle_type',
        'is_active',
        'is_verified',
        'rating',
        'total_deliveries'
      ],
      where: {
        is_active: true,
        is_verified: true
      }
    });

    const formatted = drivers.map((d) => {
      const coords = d.current_location?.coordinates || [];
      return {
        id: d.id,
        driver_code: d.driver_code,
        name: `${d.first_name} ${d.last_name}`,
        phone: d.phone,
        status: d.status,
        vehicle_type: d.vehicle_type,
        rating: d.rating ? parseFloat(d.rating) : null,
        total_deliveries: d.total_deliveries || 0,
        lat: coords[1] || null,
        lng: coords[0] || null
      };
    }).filter(d => d.lat && d.lng); // Only return drivers with valid coordinates

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

// ==================== CACHE MANAGEMENT ====================

/**
 * GET /admin/cache/stats
 * Get cache statistics
 */
export const getCacheStats = async (req, res, next) => {
  try {
    const stats = cacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/cache/clear
 * Clear all cache
 */
export const clearCache = async (req, res, next) => {
  try {
    await cacheService.flush();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /admin/cache/invalidate/:pattern
 * Invalidate cache by pattern
 */
export const invalidateCachePattern = async (req, res, next) => {
  try {
    const { pattern } = req.params;
    const count = await cacheService.delPattern(`*${pattern}*`);
    
    res.json({
      success: true,
      message: `Cache invalidated for pattern: ${pattern}`,
      keys_deleted: count
    });
  } catch (err) {
    next(err);
  }
};
