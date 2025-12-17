import {
  createHomeCategory,
  deleteHomeCategory,
  listHomeCategories,
  updateHomeCategory
} from "../services/homeCategory.service.js";
import { clearHomepageModulesCache } from "../services/homepage.service.js";

export const getCategories = async (req, res, next) => {
  try {
    const categories = await listHomeCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await createHomeCategory(req.body);
    await clearHomepageModulesCache();
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateHomeCategory(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const removeCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteHomeCategory(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    next(err);
  }
};
