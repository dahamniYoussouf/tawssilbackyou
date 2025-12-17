import ThematicSelection from "../models/ThematicSelection.js";
import HomeCategory from "../models/HomeCategory.js";

export const listThematicSelections = async (options = {}) => {
  const where = {};
  if (options.activeOnly) {
    where.is_active = true;
  }
  if (options.homeCategoryId) {
    where.home_category_id = options.homeCategoryId;
  }

  return ThematicSelection.findAll({
    where,
    include: [{
      model: HomeCategory,
      as: "home_category",
      attributes: ["id", "name", "slug", "image_url", "is_active"]
    }],
    order: [
      ["created_at", "DESC"]
    ]
  });
};

export const createThematicSelection = async (payload) => {
  const category = await HomeCategory.findByPk(payload.home_category_id);
  if (!category) {
    throw new Error("Home category not found");
  }
  return ThematicSelection.create(payload);
};

export const getThematicSelectionById = async (id) => {
  return ThematicSelection.findByPk(id);
};

export const updateThematicSelection = async (id, payload) => {
  const selection = await getThematicSelectionById(id);
  if (!selection) return null;
  if (payload.home_category_id) {
    const category = await HomeCategory.findByPk(payload.home_category_id);
    if (!category) {
      throw new Error("Home category not found");
    }
  }
  await selection.update(payload);
  return selection;
};

export const deleteThematicSelection = async (id) => {
  return ThematicSelection.destroy({ where: { id } });
};
