import {
  getAllClients,
  updateClient,
  deleteClient, 
  getClientOrdersWithFilters
} from "../services/client.service.js";
import Client from "../models/Client.js"


// Get all with pagination
export const getAll = async (req, res, next) => {
  try {
    const filters = {
      page: req.query.page || 1,
      limit: req.query.limit || req.query.pageSize || 20,
      search: req.query.search,
      is_active: req.query.is_active,
      is_verified: req.query.is_verified
    };

    const result = await getAllClients(filters);
    res.json({ 
      success: true, 
      data: result.clients,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
};

// Update
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await updateClient(id, req.body);

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    res.json({ success: true, message: "Client updated successfully" });
  } catch (err) {
    //  errors Sequelize
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
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

    next(err); // autre erreur => middleware global
  }
};

// Delete
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteClient(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    res.status(200).json({ success: true, message: "Client deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ✅ NEW: Get authenticated client's profile
export const getProfile = async (req, res, next) => {
  try {
    // Get client profile from user_id in JWT
    const client = await Client.findOne({ 
      where: { user_id: req.user.id },
      attributes: { exclude: [] } // Include all fields
    });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found"
      });
    }

    res.json({ 
      success: true, 
      data: {
        ...client.toJSON(),
        full_name: client.getFullName()
      }
    });
  } catch (err) {
    next(err);
  }
};

// ✅ NEW: Update authenticated client's own profile
export const updateProfile = async (req, res, next) => {
  try {
    // Get client profile ID from user_id in JWT
    const client = await Client.findOne({ where: { user_id: req.user.id } });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found"
      });
    }

    const updatedClient = await updateClient(client.id, req.body);

    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      data: {
        ...updatedClient.toJSON(),
        full_name: updatedClient.getFullName()
      }
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
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



export const getMyOrders = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: "Client profile not found in token"
      });
    }

    const filters = {
      client_id: clientId,
      status: req.query.status,
      date_range: req.query.date_range,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      search: req.query.search,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    };

    const result = await getClientOrdersWithFilters(filters);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
      summary: result.summary
    });
  } catch (err) {
    next(err);
  }
};