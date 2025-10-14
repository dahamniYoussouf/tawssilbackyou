import Driver from "../models/Driver.js";
import { Op } from "sequelize";

// Create driver
export const createDriver = async (driverData) => {
  // Generate driver code
  const lastDriver = await Driver.findOne({
    order: [['created_at', 'DESC']]
  });
  
  let driverNumber = 1;
  if (lastDriver && lastDriver.driver_code) {
    const lastNumber = parseInt(lastDriver.driver_code.split('-')[1]);
    driverNumber = lastNumber + 1;
  }
  
  const driver_code = `DRV-${driverNumber.toString().padStart(4, '0')}`;
  
  const driver = await Driver.create({
    ...driverData,
    driver_code
  });
  
  return driver;
};

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

// Update driver location
export const updateDriverLocation = async (id, longitude, latitude) => {
  const driver = await Driver.findByPk(id);
  if (!driver) return null;
  
  driver.setCurrentLocation(longitude, latitude);
  driver.last_active_at = new Date();
  await driver.save();
  
  return driver;
};



// Get available drivers
export const getAvailableDrivers = async () => {
  return Driver.findAll({
    where: {
      status: 'available',
      is_active: true,
      is_verified: true,
      active_order_id: null
    },
    order: [['rating', 'DESC']]
  });
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