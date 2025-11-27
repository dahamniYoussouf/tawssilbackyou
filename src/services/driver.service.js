import Driver from "../models/Driver.js";
import { Op } from "sequelize";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";


// Get all drivers with pagination
export const getAllDrivers = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    is_active,
    is_verified,
    search
  } = filters;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  if (is_active !== undefined) {
    where.is_active = is_active === 'true' || is_active === true;
  }
  
  if (is_verified !== undefined) {
    where.is_verified = is_verified === 'true' || is_verified === true;
  }
  
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { driver_code: { [Op.iLike]: `%${search}%` } },
      { license_number: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const { count, rows } = await Driver.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset
  });

  return {
    drivers: rows,
    pagination: {
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(count / parseInt(limit, 10)),
      total_items: count,
      items_per_page: parseInt(limit, 10)
    }
  };
};

// Get driver by ID
export const getDriverById = async (id) => {
  return Driver.findByPk(id);
};

// Get driver by user ID
export const getDriverByUserId = async (user_id) => {
  return Driver.findOne({ where: { user_id } });
};

// Update driver
export const updateDriver = async (id, updateData) => {
  const driver = await Driver.findByPk(id);
  if (!driver) return null;
  
  // Normaliser le numéro de téléphone si présent
  if (updateData.phone) {
    updateData.phone = normalizePhoneNumber(updateData.phone);
  }
  
  await driver.update(updateData);
  return driver;
};

// Delete driver
export const deleteDriver = async (id) => {
  const driver = await Driver.findByPk(id);
  if (!driver) return false;
  
  await driver.destroy();
  return true;
};

// Update driver status
export const updateDriverStatus = async (id, status) => {
  const driver = await Driver.findByPk(id);
  if (!driver) return null;
  
  driver.status = status;
  if (status === 'available' || status === 'busy') {
    driver.last_active_at = new Date();
  }
  
  await driver.save();
  return driver;
};


// Get driver statistics
export const getDriverStatistics = async (driver_id) => {
  const driver = await Driver.findByPk(driver_id);
  if (!driver) return null;
  
  return {
    total_deliveries: driver.total_deliveries,
    rating: driver.rating,
    status: driver.status,
    is_verified: driver.is_verified,
    vehicle_type: driver.vehicle_type
  };
};