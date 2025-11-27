import Driver from "../models/Driver.js";
import { Op } from "sequelize";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";


// Get all drivers
export const getAllDrivers = async (filters = {}) => {
  const where = {};
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.is_active !== undefined) {
    where.is_active = filters.is_active;
  }
  
  if (filters.is_verified !== undefined) {
    where.is_verified = filters.is_verified;
  }
  
  if (filters.search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${filters.search}%` } },
      { last_name: { [Op.iLike]: `%${filters.search}%` } },
      { phone: { [Op.iLike]: `%${filters.search}%` } },
      { driver_code: { [Op.iLike]: `%${filters.search}%` } }
    ];
  }
  
  return Driver.findAll({
    where,
    order: [['created_at', 'DESC']]
  });
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