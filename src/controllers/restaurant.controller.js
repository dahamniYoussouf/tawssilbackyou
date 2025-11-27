// src/controllers/restaurant.controller.js
import * as restaurantService from "../services/restaurant.service.js";


/**
 * Get all restaurants (basic info only - public)
 */
export const getAll = async (req, res, next) => {
  try {
    const restaurants = await restaurantService.getAllRestaurants();
    res.json({
      success: true,
      data: restaurants
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Filter nearby restaurants with advanced options
 * ✅ REQUIRES AUTHENTICATION - client_id from JWT
 */
export const nearbyFilter = async (req, res, next) => {
  try {
    // Parse categories if it's a string
    if (req.body.categories && typeof req.body.categories === 'string') {
      req.body.categories = req.body.categories.split(',').map(c => c.trim());
    }

    // ✅ Get client_id from JWT token (guaranteed to exist because of isClient middleware)
    const filters = {
      ...req.body,
      client_id: req.user.client_id
    };

    const result = await restaurantService.filterNearbyRestaurants(filters);
    
    res.json({
      success: true,
      count: result.count,
      page: result.page,
      pageSize: result.pageSize,
      radius: result.radius,
      center: result.center,
      data: result.formatted,
      searchType: result.searchType,
      client_id: result.client_id
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Filter nearby restaurants with advanced options
 * ✅ REQUIRES AUTHENTICATION - client_id from JWT
 */
export const filter = async (req, res, next) => {
  try {
    // Parse categories if it's a string
    if (req.body.categories && typeof req.body.categories === 'string') {
      req.body.categories = req.body.categories.split(',').map(c => c.trim());
    }

    // ✅ Get client_id from JWT token (guaranteed to exist because of isClient middleware)
    const filters = {
      ...req.body
    };

    const result = await restaurantService.filter(filters);
    
    res.json({
      success: true,
      count: result.count,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      data: result.formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get nearby restaurant names only
 * ✅ REQUIRES AUTHENTICATION
 */
export const getNearbyNames = async (req, res, next) => {
  try {
    const result = await restaurantService.getNearbyRestaurantNames(req.body);

    res.json({
      success: true,
      count: result.count,
      radius: result.radius,
      center: result.center,
      data: result.names,
      searchType: result.searchType
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update restaurant profile (own profile only)
 */
export const updateProfile = async (req, res, next) => {
  try {
    // Get restaurant_id directly from JWT token
    const restaurantId = req.user.restaurant_id;
    
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        error: "Restaurant profile not found in token"
      });
    }

    // Validate categories if provided
    if (req.body.categories !== undefined) {
      if (!Array.isArray(req.body.categories) || req.body.categories.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Categories must be a non-empty array"
        });
      }
    }

    const updatedRestaurant = await restaurantService.updateRestaurant(restaurantId, req.body);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedRestaurant
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update restaurant (admin only)
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate categories if provided
    if (req.body.categories !== undefined) {
      if (!Array.isArray(req.body.categories) || req.body.categories.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Categories must be a non-empty array"
        });
      }
    }

    const updatedRestaurant = await restaurantService.updateRestaurant(id, req.body);

    res.json({
      success: true,
      data: updatedRestaurant
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a restaurant
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Restaurant ID is required"
      });
    }

    await restaurantService.deleteRestaurant(id);

    res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get restaurant menu with categories and items
 * ✅ REQUIRES AUTHENTICATION - shows favorites
 */
export const getRestaurantMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // ✅ Get client_id from JWT token (guaranteed to exist)
    const client_id = req.user.client_id;

    const menu = await restaurantService.getCategoriesWithMenuItems(restaurantId, client_id);

    res.status(200).json({
      success: true,
      data: menu
    });
  } catch (error) {
    res.status(error.message === 'Restaurant not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};


/**
 * Get restaurant statistics
 * GET /api/restaurants/statistics/me (for authenticated restaurant)
 * GET /api/restaurants/:id/statistics (for admin)
 */
export const getRestaurantStatistics = async (req, res, next) => {
  try {
    // Get restaurant_id from JWT token or URL parameter
    const restaurantId = req.user?.restaurant_id || req.params.id;
    
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID not found"
      });
    }

    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const stats = await restaurantService.getRestaurantStatistics(restaurantId, filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    if (err.message === 'Restaurant not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};


/**
 * Get restaurant's own profile
 * GET /api/restaurants/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    // Get restaurant_id from JWT token
    const restaurantId = req.user.restaurant_id;
    
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        error: "Restaurant profile not found in token"
      });
    }

    const profile = await restaurantService.getRestaurantProfile(restaurantId);

    res.json({
      success: true,
      data: profile
    });
  } catch (err) {
    if (err.message === 'Restaurant not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};