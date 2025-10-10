import * as restaurantService from "../services/restaurant.service.js";

/**
 * Create a restaurant
 */
export const create = async (req, res, next) => {
  try {
    // Validate categories
    const { categories } = req.body;
    
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one category is required and must be an array"
      });
    }

    const resto = await restaurantService.createRestaurant(req.body);
    res.status(201).json({
      success: true,
      data: resto
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all restaurants
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
 * Supports filtering by multiple categories
 */
export const nearbyFilter = async (req, res, next) => {
  try {
    // Parse categories if it's a string (e.g., from query params)
    if (req.body.categories && typeof req.body.categories === 'string') {
      req.body.categories = req.body.categories.split(',').map(c => c.trim());
    }

    const result = await restaurantService.filterNearbyRestaurants(req.body);
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
 * Get nearby restaurant names only
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
 * Update a restaurant
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
 * Get a  restaurant all data
 */
export const getRestaurantMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { client_id } = req.query; // Optional client_id for favorites

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