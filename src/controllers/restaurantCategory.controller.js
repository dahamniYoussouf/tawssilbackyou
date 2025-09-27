import RestaurantCategory from "../models/RestaurantCategory.js";

// Create a new Restaurant category
export const create = async (req, res, next) => {
  try {
    const { nom, description, icone_url, ordre_affichage } = req.body;

    const category = await RestaurantCategory.create({
      nom,
      description,
      icone_url,
      ordre_affichage,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

// Get all Restaurant categories
export const getAll = async (req, res, next) => {
  try {
    const categories = await RestaurantCategory.findAll({
      order: [["ordre_affichage", "ASC"], ["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

// Update a Restaurant category by UUID
export const update = async (req, res, next) => {
  try {
    const { id } = req.params; // UUID

    const { nom, description, icone_url, ordre_affichage } = req.body;

    const category = await RestaurantCategory.findOne({ where: { id } });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant category not found" });
    }

    await category.update({
      nom,
      description,
      icone_url,
      ordre_affichage,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

// Delete a Restaurant category by UUID
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await RestaurantCategory.destroy({ where: { id } });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Restaurant category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Restaurant category deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
