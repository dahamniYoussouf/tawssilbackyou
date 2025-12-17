import { Op } from "sequelize";
import DailyDeal from "../models/DailyDeal.js";
import Promotion from "../models/Promotion.js";

const ensureDatesWithinPromotion = (promotion, startDate, endDate) => {
  if (!promotion) return;
  if (promotion.start_date && startDate) {
    const startDeal = new Date(startDate);
    if (startDeal < promotion.start_date) {
      throw new Error("Daily deal must start no earlier than the linked promotion");
    }
  }

  if (promotion.end_date && endDate) {
    const endDeal = new Date(endDate);
    if (endDeal > promotion.end_date) {
      throw new Error("Daily deal must end no later than the linked promotion");
    }
  }
};

export const listDailyDeals = async (options = {}) => {
  const where = {};
  if (options.activeOnly) {
    const now = new Date();
    where.is_active = true;
    where.start_date = { [Op.lte]: now };
    where.end_date = { [Op.gte]: now };
  }

  return DailyDeal.findAll({
    where,
    include: [
      {
        model: Promotion,
        as: "promotion",
        include: [{
          association: "restaurant",
          attributes: ["id", "name", "image_url"]
        }]
      }
    ],
    order: [["start_date", "DESC"]]
  });
};

export const createDailyDeal = async (payload) => {
  const promotion = await Promotion.findByPk(payload.promotion_id);
  if (!promotion) {
    throw new Error("Promotion not found");
  }

  ensureDatesWithinPromotion(promotion, payload.start_date, payload.end_date);

  const deal = await DailyDeal.create(payload);
  return deal.reload({
    include: [
      {
        model: Promotion,
        as: "promotion",
        include: [{
          association: "restaurant",
          attributes: ["id", "name", "image_url"]
        }]
      }
    ]
  });
};

export const getDailyDealById = async (id) => {
  return DailyDeal.findByPk(id);
};

export const updateDailyDeal = async (id, payload) => {
  const deal = await getDailyDealById(id);
  if (!deal) return null;
  const targetPromotionId = payload.promotion_id || deal.promotion_id;
  const promotion = await Promotion.findByPk(targetPromotionId);
  if (!promotion) {
    throw new Error("Promotion not found");
  }

  const startDate = payload.start_date || deal.start_date;
  const endDate = payload.end_date || deal.end_date;
  ensureDatesWithinPromotion(promotion, startDate, endDate);

  await deal.update(payload);
  return deal.reload({
    include: [
      {
        model: Promotion,
        as: "promotion",
        include: [{
          association: "restaurant",
          attributes: ["id", "name", "image_url"]
        }]
      }
    ]
  });
};

export const deleteDailyDeal = async (id) => {
  return DailyDeal.destroy({ where: { id } });
};
