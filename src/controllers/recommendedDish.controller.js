import {
  createRecommendedDish,
  deleteRecommendedDish,
  listRecommendedDishes,
  updateRecommendedDish
} from "../services/recommendedDish.service.js";
import { clearHomepageModulesCache } from "../services/homepage.service.js";

export const getRecommendedDishes = async (req, res, next) => {
  try {
    const dishes = await listRecommendedDishes();
    res.json({ success: true, data: dishes });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const dish = await createRecommendedDish(req.body);
    await clearHomepageModulesCache();
    res.status(201).json({ success: true, data: dish });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dish = await updateRecommendedDish(id, req.body);
    if (!dish) {
      return res.status(404).json({ success: false, message: "Recommended dish not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, data: dish });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteRecommendedDish(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Recommended dish not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, message: "Recommended dish removed" });
  } catch (err) {
    next(err);
  }
};
