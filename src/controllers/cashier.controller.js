// src/controllers/cashier.controller.js
import {
  getAllCashiers,
  getCashierById,
  updateCashier,
  deleteCashier,
  updateCashierStatus,
  getCashierStatistics,
  getCashierDashboardToday
} from "../services/cashier.service.js";

/**
 * Get all cashiers with filters and pagination
 */
export const getAll = async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || req.query.pageSize || 20,
      restaurant_id: req.query.restaurant_id,
      status: req.query.status,
      is_active: req.query.is_active,
      search: req.query.search
    };
    
    const result = await getAllCashiers(filters);
    res.json({ 
      success: true, 
      data: result.cashiers,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get cashier by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cashier = await getCashierById(id);

    if (!cashier) {
      return res.status(404).json({ 
        success: false, 
        message: "Cashier not found" 
      });
    }

    res.json({ success: true, data: cashier });
  } catch (err) {
    next(err);
  }
};

/**
 * Update cashier
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cashier = await updateCashier(id, req.body);

    if (!cashier) {
      return res.status(404).json({ 
        success: false, 
        message: "Cashier not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Cashier updated successfully",
      data: cashier
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

/**
 * Delete cashier
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteCashier(id);

    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: "Cashier not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Cashier deleted successfully" 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get authenticated cashier's profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const cashierId = req.user.cashier_id;
    
    if (!cashierId) {
      return res.status(400).json({
        success: false,
        message: "Cashier profile not found in token"
      });
    }

    const cashier = await getCashierById(cashierId);

    if (!cashier) {
      return res.status(404).json({ 
        success: false, 
        message: "Cashier profile not found" 
      });
    }

    const cashierData = cashier.toJSON();
    
    res.json({ 
      success: true, 
      data: cashierData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update authenticated cashier's own profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const cashierId = req.user.cashier_id;
    
    if (!cashierId) {
      return res.status(400).json({
        success: false,
        message: "Cashier profile not found in token"
      });
    }

    // Only allow updating certain fields
    const allowedUpdates = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone,
      email: req.body.email,
      profile_image_url: req.body.profile_image_url
    };

    const cashier = await updateCashier(cashierId, allowedUpdates);

    if (!cashier) {
      return res.status(404).json({ 
        success: false, 
        message: "Cashier not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      data: cashier
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

/**
 * Update cashier status (start/end shift, break, etc.)
 */
export const updateStatus = async (req, res, next) => {
  try {
    const cashierId = req.user.cashier_id;
    const { status } = req.body;

    if (!cashierId) {
      return res.status(400).json({
        success: false,
        message: "Cashier profile not found in token"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const validStatuses = ['active', 'on_break', 'offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: active, on_break, or offline"
      });
    }

    const cashier = await updateCashierStatus(cashierId, status);

    if (!cashier) {
      return res.status(404).json({ 
        success: false, 
        message: "Cashier not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Status updated successfully",
      data: {
        status: cashier.status,
        shift_start: cashier.shift_start,
        shift_end: cashier.shift_end
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get cashier statistics
 */
export const getStatistics = async (req, res, next) => {
  try {
    const cashierId = req.user.cashier_id;
    
    if (!cashierId) {
      return res.status(400).json({
        success: false,
        message: "Cashier profile not found in token"
      });
    }

    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const stats = await getCashierStatistics(cashierId, filters);

    if (!stats) {
      return res.status(404).json({ 
        success: false, 
        message: "Cashier not found" 
      });
    }

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

/**
 * Dashboard (today) for cashier
 */
export const getDashboardToday = async (req, res, next) => {
  try {
    const cashierId = req.user.cashier_id;
    
    if (!cashierId) {
      return res.status(400).json({
        success: false,
        message: "Cashier profile not found in token"
      });
    }

    const dashboard = await getCashierDashboardToday(cashierId);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: "Cashier not found"
      });
    }

    res.json({ success: true, data: dashboard });
  } catch (err) {
    next(err);
  }
};
