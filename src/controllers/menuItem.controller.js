import MenuItem from "../models/MenuItem.js";

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
