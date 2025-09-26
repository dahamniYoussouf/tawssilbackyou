import FoodCategory from "../models/FoodCategory.js";

// Create a new food category
export const create = async (req, res, next) => {
  try {
    const { nom, description, icone_url, ordre_affichage } = req.body;

    const category = await FoodCategory.create({
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

// Get all food categories
export const getAll = async (req, res, next) => {
  try {
    const categories = await FoodCategory.findAll({
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

// Update a food category by UUID
export const update = async (req, res, next) => {
  try {
    const { id } = req.params; // UUID

    const { nom, description, icone_url, ordre_affichage } = req.body;

    const category = await FoodCategory.findOne({ where: { id } });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Food category not found" });
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

// Delete a food category by UUID
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await FoodCategory.destroy({ where: { id } });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Food category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Food category deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
