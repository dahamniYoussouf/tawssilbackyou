// src/services/cashier.service.js
import Cashier from "../models/Cashier.js";
import Restaurant from "../models/Restaurant.js";
import Order from "../models/Order.js";
import { Op } from "sequelize";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";

/**
 * Get all cashiers with pagination and filters
 */
export const getAllCashiers = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    restaurant_id,
    status,
    is_active,
    search
  } = filters;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where = {};
  
  if (restaurant_id) {
    where.restaurant_id = restaurant_id;
  }
  
  if (status) {
    where.status = status;
  }
  
  if (is_active !== undefined) {
    where.is_active = is_active === 'true' || is_active === true;
  }
  
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { cashier_code: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const { count, rows } = await Cashier.findAndCountAll({
    where,
    include: [{
      model: Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'address']
    }],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset
  });

  return {
    cashiers: rows,
    pagination: {
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(count / parseInt(limit, 10)),
      total_items: count,
      items_per_page: parseInt(limit, 10)
    }
  };
};

/**
 * Get cashier by ID
 */
export const getCashierById = async (id) => {
  return Cashier.findByPk(id, {
    include: [{
      model: Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'address', 'phone_number', 'email']
    }]
  });
};

/**
 * Get cashier by user ID
 */
export const getCashierByUserId = async (user_id) => {
  return Cashier.findOne({ 
    where: { user_id },
    include: [{
      model: Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name', 'address', 'phone_number', 'email']
    }]
  });
};

/**
 * Update cashier
 */
export const updateCashier = async (id, updateData) => {
  const cashier = await Cashier.findByPk(id);
  if (!cashier) return null;
  
  // Normaliser le numéro de téléphone si présent
  if (updateData.phone) {
    updateData.phone = normalizePhoneNumber(updateData.phone);
  }
  
  await cashier.update(updateData);
  return cashier;
};

/**
 * Delete cashier
 */
export const deleteCashier = async (id) => {
  const cashier = await Cashier.findByPk(id);
  if (!cashier) return false;
  
  await cashier.destroy();
  return true;
};

/**
 * Update cashier status
 */
export const updateCashierStatus = async (id, status) => {
  const cashier = await Cashier.findByPk(id);
  if (!cashier) return null;
  
  cashier.status = status;
  cashier.last_active_at = new Date();
  
  if (status === 'active' && !cashier.shift_start) {
    await cashier.startShift();
  } else if (status === 'offline' && cashier.shift_start) {
    await cashier.endShift();
  } else {
    await cashier.save();
  }
  
  return cashier;
};

/**
 * Get cashier statistics
 */
export const getCashierStatistics = async (cashier_id, filters = {}) => {
  const cashier = await Cashier.findByPk(cashier_id);
  if (!cashier) return null;

  const { date_from, date_to } = filters;
  
  // Build date filter
  const dateWhere = { created_by_cashier_id: cashier_id };
  if (date_from) dateWhere.created_at = { [Op.gte]: new Date(date_from) };
  if (date_to) {
    if (dateWhere.created_at) {
      dateWhere.created_at[Op.lte] = new Date(date_to);
    } else {
      dateWhere.created_at = { [Op.lte]: new Date(date_to) };
    }
  }

  const orders = await Order.findAll({
    where: dateWhere,
    attributes: ['id', 'status', 'total_amount', 'created_at']
  });

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  const totalSales = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  const averageOrderValue = completedOrders > 0 
    ? (totalSales / completedOrders).toFixed(2) 
    : 0;

  // Calculate shift duration if active
  let shiftDuration = null;
  if (cashier.shift_start) {
    const end = cashier.shift_end || new Date();
    const durationMs = end - new Date(cashier.shift_start);
    shiftDuration = Math.floor(durationMs / (1000 * 60)); // minutes
  }

  return {
    cashier: {
      id: cashier.id,
      cashier_code: cashier.cashier_code,
      name: cashier.getFullName(),
      status: cashier.status
    },
    statistics: {
      total_orders_processed: cashier.total_orders_processed,
      total_sales_amount: parseFloat(cashier.total_sales_amount),
      orders_in_period: totalOrders,
      completed_orders: completedOrders,
      total_sales_in_period: parseFloat(totalSales.toFixed(2)),
      average_order_value: parseFloat(averageOrderValue),
      current_shift_duration_minutes: shiftDuration
    },
    current_shift: {
      shift_start: cashier.shift_start,
      shift_end: cashier.shift_end,
      status: cashier.status
    }
  };
};