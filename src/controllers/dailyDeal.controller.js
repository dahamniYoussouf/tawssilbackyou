import {
  createDailyDeal,
  deleteDailyDeal,
  listDailyDeals,
  updateDailyDeal
} from "../services/dailyDeal.service.js";
import { clearHomepageModulesCache } from "../services/homepage.service.js";

export const getDailyDeals = async (req, res, next) => {
  try {
    const deals = await listDailyDeals();
    res.json({ success: true, data: deals });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const deal = await createDailyDeal(req.body);
    await clearHomepageModulesCache();
    res.status(201).json({ success: true, data: deal });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deal = await updateDailyDeal(id, req.body);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Daily deal not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, data: deal });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDailyDeal(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Daily deal not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, message: "Daily deal deleted" });
  } catch (err) {
    next(err);
  }
};
