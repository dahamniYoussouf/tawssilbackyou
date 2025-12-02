// src/controllers/menuItem.controller.js
import * as menuItemService from "../services/menuItem.service.js";
import MenuItem from "../models/MenuItem.js";
import FoodCategory from "../models/FoodCategory.js";
import { Op } from "sequelize";

/**
 * Create a new menu item
 * ✅ Restaurant crée un item pour lui-même
 */
export const create = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    // ✅ Vérifier que la catégorie appartient au restaurant
    const category = await FoodCategory.findOne({
      where: { 
        id: req.body.category_id,
        restaurant_id 
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found or doesn't belong to your restaurant"
      });
    }

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
 * Get MY menu items (authenticated restaurant)
 * ✅ Avec pagination, filtres et recherche
 */
export const getMyMenuItems = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    const { 
      page = 1, 
      limit = 20,
      category_id,
      is_available,
      search,
      sort = 'created_at' // 'nom', 'prix', 'created_at'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construction du where clause
    const where = {};

    // Filtrer par catégories du restaurant
    const restaurantCategories = await FoodCategory.findAll({
      where: { restaurant_id },
      attributes: ['id']
    });
    
    const categoryIds = restaurantCategories.map(cat => cat.id);
    where.category_id = { [Op.in]: categoryIds };

    // Filtre par catégorie spécifique
    if (category_id) {
      // Vérifier que la catégorie appartient au restaurant
      if (!categoryIds.includes(category_id)) {
        return res.status(403).json({
          success: false,
          message: "Category doesn't belong to your restaurant"
        });
      }
      where.category_id = category_id;
    }

    // Filtre par disponibilité
    if (is_available !== undefined) {
      where.is_available = is_available === 'true';
    }

    // Recherche par nom
    if (search && search.trim()) {
      where.nom = { [Op.iLike]: `%${search.trim()}%` };
    }

    // Construction de l'ordre de tri
    let order;
    switch (sort) {
      case 'nom':
        order = [['nom', 'ASC']];
        break;
      case 'prix':
        order = [['prix', 'ASC']];
        break;
      case 'created_at':
      default:
        order = [['created_at', 'DESC']];
    }

    const { count, rows } = await MenuItem.findAndCountAll({
      where,
      include: [
        { 
          model: FoodCategory, 
          as: 'category', 
          attributes: ['id', 'nom'] 
        }
      ],
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / parseInt(limit)),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all menu items with optional filters (pagination, search, etc.)
 * Pour admin ou public
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
 * Pour clients
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
 * ✅ Restaurant met à jour SON item
 */
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    // ✅ Vérifier que l'item appartient au restaurant
    const item = await MenuItem.findOne({
      where: { id },
      include: [{
        model: FoodCategory,
        as: 'category',
        where: { restaurant_id }
      }]
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found or doesn't belong to your restaurant"
      });
    }

    // Si changement de catégorie, vérifier qu'elle appartient au restaurant
    if (req.body.category_id && req.body.category_id !== item.category_id) {
      const newCategory = await FoodCategory.findOne({
        where: { 
          id: req.body.category_id,
          restaurant_id 
        }
      });

      if (!newCategory) {
        return res.status(404).json({
          success: false,
          message: "New category not found or doesn't belong to your restaurant"
        });
      }
    }

    const updatedItem = await menuItemService.updateMenuItem(id, req.body);
    
    res.json({
      success: true,
      data: updatedItem
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle a menu item's availability
 * ✅ Restaurant toggle SON item
 */
export const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    // ✅ Vérifier que l'item appartient au restaurant
    const item = await MenuItem.findOne({
      where: { id },
      include: [{
        model: FoodCategory,
        as: 'category',
        where: { restaurant_id }
      }]
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found or doesn't belong to your restaurant"
      });
    }

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
 * ✅ Restaurant met à jour SES items
 */
export const bulkUpdateAvailability = async (req, res, next) => {
  try {
    const { menu_item_ids, is_available } = req.body;
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    // ✅ Vérifier que TOUS les items appartiennent au restaurant
    const items = await MenuItem.findAll({
      where: { id: { [Op.in]: menu_item_ids } },
      include: [{
        model: FoodCategory,
        as: 'category',
        attributes: ['restaurant_id']
      }]
    });

    // Vérifier que tous les items trouvés appartiennent au restaurant
    const allBelongToRestaurant = items.every(
      item => item.category.restaurant_id === restaurant_id
    );

    if (!allBelongToRestaurant || items.length !== menu_item_ids.length) {
      return res.status(403).json({
        success: false,
        message: "Some items don't belong to your restaurant or don't exist"
      });
    }

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
 * ✅ Restaurant supprime SON item
 */
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id; // ✅ from JWT
    
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    // ✅ Vérifier que l'item appartient au restaurant
    const item = await MenuItem.findOne({
      where: { id },
      include: [{
        model: FoodCategory,
        as: 'category',
        where: { restaurant_id }
      }]
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found or doesn't belong to your restaurant"
      });
    }

    await menuItemService.deleteMenuItem(id);
    
    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get statistics for restaurant's menu items
 * ✅ Nouvelles statistiques
 */
export const getMyStatistics = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    // Récupérer toutes les catégories du restaurant
    const categories = await FoodCategory.findAll({
      where: { restaurant_id },
      attributes: ['id']
    });
    
    const categoryIds = categories.map(cat => cat.id);

    // Statistiques globales
    const totalItems = await MenuItem.count({
      where: { category_id: { [Op.in]: categoryIds } }
    });

    const availableItems = await MenuItem.count({
      where: { 
        category_id: { [Op.in]: categoryIds },
        is_available: true 
      }
    });

    const unavailableItems = totalItems - availableItems;

    // Prix moyen
    const items = await MenuItem.findAll({
      where: { category_id: { [Op.in]: categoryIds } },
      attributes: ['prix']
    });

    const averagePrice = items.length > 0
      ? items.reduce((sum, item) => sum + parseFloat(item.prix), 0) / items.length
      : 0;

    // Répartition par catégorie
    const itemsByCategory = await MenuItem.findAll({
      where: { category_id: { [Op.in]: categoryIds } },
      include: [{
        model: FoodCategory,
        as: 'category',
        attributes: ['id', 'nom']
      }],
      attributes: ['id', 'category_id']
    });

    const categoryCounts = {};
    itemsByCategory.forEach(item => {
      const catName = item.category.nom;
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total_items: totalItems,
        available_items: availableItems,
        unavailable_items: unavailableItems,
        average_price: parseFloat(averagePrice.toFixed(2)),
        items_by_category: categoryCounts
      }
    });
  } catch (err) {
    next(err);
  }
};