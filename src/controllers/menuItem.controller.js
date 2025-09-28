import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import Category from "../models/FoodCategory.js";

// Create a new menu item
export const create = async (req, res, next) => {
  try {
    const {
      restaurant_id,
      category_id,
      nom,
      description,
      prix,
      temps_preparation,
      ingredients,
      allergenes,
      photo_url,
      disponible
    } = req.body;

     // Vérifier si le restaurant existe
    const restaurant = await Restaurant.findByPk(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    // Vérifier si la catégorie existe
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const item = await MenuItem.create({
      restaurant_id,
      category_id,
      nom,
      description,
      prix,
      temps_preparation,
      ingredients,
      allergenes,
      photo_url,
      disponible
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// Get all menu items
export const getAll = async (req, res, next) => {
  try {
    const items = await MenuItem.findAll({
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

// Update a menu item by UUID
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const item = await MenuItem.findOne({ where: { id } });

    if (!item) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }

    await item.update(updates);

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// Delete a menu item by UUID
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await MenuItem.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }

    res.status(200).json({ success: true, message: "Menu item deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const getByRestaurantAndCategory = async (req, res, next) => {
  try {
    const { restaurantId, categoryId } = req.query;

    const where = {};
    if (restaurantId) where.restaurant_id = restaurantId;
    if (categoryId) where.category_id = categoryId;

    const items = await MenuItem.findAll({
      where,
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (err) {
    next(err);
  }
};
