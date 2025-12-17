import {
  createPromotion,
  deletePromotion,
  listPromotions,
  updatePromotion
} from "../services/promotion.service.js";
import { clearHomepageModulesCache } from "../services/homepage.service.js";

const parseBoolean = (value) => {
  if (value === undefined) return undefined;
  if (value === "true" || value === "1" || value === true) return true;
  if (value === "false" || value === "0" || value === false) return false;
  return undefined;
};

export const getPromotions = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      restaurant_id: req.query.restaurant_id,
      is_active: parseBoolean(req.query.is_active),
      active_on: req.query.active_on
    };

    const promotions = await listPromotions(filters);
    res.json({ success: true, data: promotions });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const promotion = await createPromotion(req.body);
    await clearHomepageModulesCache();
    res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promotion = await updatePromotion(id, req.body);
    if (!promotion) {
      return res.status(404).json({ success: false, message: "Promotion not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, data: promotion });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deletePromotion(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Promotion not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, message: "Promotion deleted successfully" });
  } catch (err) {
    next(err);
  }
};
