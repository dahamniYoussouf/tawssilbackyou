import {
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  getDriverStatistics
} from "../services/driver.service.js";
import { getDriverActiveOrders } from '../services/order.service.js';



// Get all drivers with filters and pagination
export const getAll = async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || req.query.pageSize || 20,
      status: req.query.status,
      is_active: req.query.is_active,
      is_verified: req.query.is_verified,
      search: req.query.search
    };
    
    const result = await getAllDrivers(filters);
    res.json({ 
      success: true, 
      data: result.drivers,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

// Get driver by ID
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const driver = await getDriverById(id);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
};

// Update driver
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const driver = await updateDriver(id, req.body);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Driver updated successfully",
      data: driver
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "This phone number or email is already registered",
        field: err.errors[0].path,
        value: err.errors[0].value
      });
    }

    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    next(err);
  }
};

// Delete driver
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDriver(id);

    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Driver deleted successfully" 
    });
  } catch (err) {
    next(err);
  }
};

// ✅ NEW: Get authenticated driver's profile
export const getProfile = async (req, res, next) => {
  try {
    // Get driver_id directly from JWT token
    const driverId = req.user.driver_id;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver profile not found in token"
      });
    }

    const driver = await getDriverById(driverId);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver profile not found" 
      });
    }

    // Remove sensitive data if needed
    const driverData = driver.toJSON();
    
    res.json({ 
      success: true, 
      data: driverData
    });
  } catch (err) {
    next(err);
  }
};

// ✅ NEW: Update authenticated driver's own profile
export const updateProfile = async (req, res, next) => {
  try {
    // Get driver_id directly from JWT token
    const driverId = req.user.driver_id;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver profile not found in token"
      });
    }

    const driver = await updateDriver(driverId, req.body);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      data: driver
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "This phone number or email is already registered",
        field: err.errors[0].path,
        value: err.errors[0].value
      });
    }

    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    next(err);
  }
};

// ✅ UPDATED: Update status without ID parameter
export const updateStatus = async (req, res, next) => {
  try {
    // Get driver_id directly from JWT token
    const driverId = req.user.driver_id;
    const { status } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver profile not found in token"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const driver = await updateDriverStatus(driverId, status);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Driver status updated successfully",
      data: driver
    });
  } catch (err) {
    next(err);
  }
};

// ✅ UPDATED: Get statistics without ID parameter
export const getStatistics = async (req, res, next) => {
  try {
    // Get driver_id directly from JWT token
    const driverId = req.user.driver_id;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver profile not found in token"
      });
    }

    const stats = await getDriverStatistics(driverId);

    if (!stats) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};


/**
 * GET /driver/active-orders
 * Récupérer toutes les commandes actives du livreur connecté
 */
export const getActiveOrders = async (req, res, next) => {
  try {
    const driverId = req.user.driver_id;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver profile not found in token"
      });
    }

    const result = await getDriverActiveOrders(driverId);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};