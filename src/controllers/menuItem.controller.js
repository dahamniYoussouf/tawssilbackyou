import * as menuItemService from "../services/menuItem.service.js";

/**
 * Create a new menu item
 */
export const create = async (req, res, next) => {
  try {
    const item = await menuItemService.createMenuItem(req.body);
    res.status(201).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all menu items with optional filters (pagination, search, etc.)
 */
export const getAll = async (req, res, next) => {
  try {
    const filters = req.query;
    const result = await menuItemService.getAllMenuItems(filters);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get menu item by ID
 */
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await menuItemService.getMenuItemById(id);
    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get menu items by category (with favorite support)
 */
export const getByCategory = async (req, res, next) => {
  try {
    const result = await menuItemService.getMenuItemsByCategory(req.body);
    res.json({
      success: true,
      count: result.count,
      data: result.items
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update a menu item by ID
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await menuItemService.updateMenuItem(id, req.body);
    res.json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle a menu item's availability
 */
export const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await menuItemService.toggleAvailability(id);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk update availability for multiple items
 */
export const bulkUpdateAvailability = async (req, res, next) => {
  try {
    const { menu_item_ids, is_available } = req.body;
    const result = await menuItemService.bulkUpdateAvailability(menu_item_ids, is_available);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a menu item by ID
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await menuItemService.deleteMenuItem(id);
    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};
