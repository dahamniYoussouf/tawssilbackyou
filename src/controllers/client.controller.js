import {
  getAllClients,
  updateClient,
  deleteClient, 
  getClientOrdersWithFilters
} from "../services/client.service.js";
import Client from "../models/Client.js"
import * as favoriteAddressService from "../services/favoriteAddress.service.js";


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
import { getClientProfileByUserId } from "../services/client.service.js";

export const getProfile = async (req, res, next) => {
  try {
    // Get client profile with favorite addresses from user_id in JWT
    const profile = await getClientProfileByUserId(req.user.id);

    res.json({ 
      success: true, 
      data: profile
    });
  } catch (err) {
    // Handle 404 specifically
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
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

// ===== Favorite Addresses (Client) =====
export const listFavoriteAddresses = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    const favorites = await favoriteAddressService.listFavoriteAddresses(clientId);
    res.json({ success: true, data: favorites });
  } catch (err) {
    next(err);
  }
};

export const createFavoriteAddress = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    const fav = await favoriteAddressService.createFavoriteAddress(clientId, req.body);
    res.status(201).json({ success: true, data: fav });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

export const updateFavoriteAddress = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    const { id } = req.params;
    const fav = await favoriteAddressService.updateFavoriteAddress(clientId, id, req.body);
    if (!fav) {
      return res.status(404).json({ success: false, message: "Adresse introuvable" });
    }
    res.json({ success: true, data: fav });
  } catch (err) {
    next(err);
  }
};

export const deleteFavoriteAddress = async (req, res, next) => {
  try {
    const clientId = req.user.client_id;
    const { id } = req.params;
    const ok = await favoriteAddressService.deleteFavoriteAddress(clientId, id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Adresse introuvable" });
    }
    res.json({ success: true, message: "Adresse supprimée" });
  } catch (err) {
    next(err);
  }
};
