import { Op } from "sequelize";
import MenuItem from "../models/MenuItem.js";
import Promotion from "../models/Promotion.js";
import PromotionMenuItem from "../models/PromotionMenuItem.js";
import Restaurant from "../models/Restaurant.js";

const promotionIncludes = [
  {
    model: Restaurant,
    as: "restaurant",
    attributes: ["id", "name", "is_premium", "image_url"]
  },
  {
    model: MenuItem,
    as: "menu_item",
    attributes: ["id", "nom", "prix", "photo_url"]
  },
  {
    model: MenuItem,
    as: "menu_items",
    through: { attributes: [] },
    attributes: ["id", "nom", "prix", "photo_url"]
  }
];

const deriveBadgeText = (payload) => {
  if (payload.badge_text) {
    return payload.badge_text;
  }

  switch (payload.type) {
    case "percentage":
      return payload.discount_value ? `-${payload.discount_value}%` : null;
    case "amount":
      return payload.discount_value ? `-${payload.discount_value} ${payload.currency || "DZD"}` : null;
    case "free_delivery":
      return "Livraison gratuite";
    case "buy_x_get_y":
      if (payload.buy_quantity && payload.free_quantity) {
        return `${payload.buy_quantity} acheté = ${payload.free_quantity} offert`;
      }
      return "Offre achetez X obtenez Y";
    case "other":
      return payload.custom_message?.slice(0, 80) || "Offre spéciale";
    default:
      return null;
  }
};

const fetchMenuItemsAndValidate = async (ids = [], restaurantId) => {
  if (!ids.length) return [];
  const menuItems = await MenuItem.findAll({
    where: { id: ids }
  });

  if (menuItems.length !== ids.length) {
    throw new Error("One or more menu items do not exist");
  }

  if (restaurantId) {
    menuItems.forEach((item) => {
      if (item.restaurant_id !== restaurantId) {
        throw new Error("All menu items must belong to the same restaurant");
      }
    });
  }

  return menuItems;
};

const assignMenuItems = async (promotion, ids = [], restaurantId) => {
  if (!ids.length) {
    await promotion.setMenu_items([]);
    return;
  }

  const menuItems = await fetchMenuItemsAndValidate(ids, restaurantId);
  await promotion.setMenu_items(menuItems);
};

const computeMenuItemIdsFromPayload = (payload) => {
  const ids = new Set(payload.menu_item_ids || []);
  if (payload.menu_item_id) {
    ids.add(payload.menu_item_id);
  }
  return Array.from(ids);
};

const ensureRestaurant = async (restaurantId) => {
  if (!restaurantId) return null;
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) {
    throw new Error("Restaurant not found");
  }
  return restaurant;
};

export const createPromotion = async (payload) => {
  await ensureRestaurant(payload.restaurant_id);
  const promotionPayload = {
    ...payload,
    badge_text: deriveBadgeText(payload)
  };

  const promotion = await Promotion.create(promotionPayload);
  const menuItemIds = computeMenuItemIdsFromPayload(payload);
  if (menuItemIds.length) {
    await assignMenuItems(promotion, menuItemIds, payload.restaurant_id);
  }

  return promotion.reload({ include: promotionIncludes });
};

export const getPromotionById = async (id) => {
  return Promotion.findByPk(id, {
    include: promotionIncludes
  });
};

export const listPromotions = async (filters = {}) => {
  const where = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.restaurant_id) {
    where.restaurant_id = filters.restaurant_id;
  }

  if (typeof filters.is_active !== "undefined") {
    where.is_active = filters.is_active;
  }

  if (filters.active_on) {
    const activeDate = new Date(filters.active_on);
    where[Op.and] = [
      {
        [Op.or]: [
          { start_date: null },
          { start_date: { [Op.lte]: activeDate } }
        ]
      },
      {
        [Op.or]: [
          { end_date: null },
          { end_date: { [Op.gte]: activeDate } }
        ]
      }
    ];
  }

  return Promotion.findAll({
    where,
    include: promotionIncludes,
    order: [["created_at", "DESC"]]
  });
};

export const updatePromotion = async (id, payload) => {
  const promotion = await Promotion.findByPk(id);
  if (!promotion) return null;

  if (payload.restaurant_id) {
    await ensureRestaurant(payload.restaurant_id);
  }

  const updatedPayload = {
    ...payload
  };

  if (payload.badge_text === undefined) {
    updatedPayload.badge_text = deriveBadgeText({ ...promotion.toJSON(), ...payload });
  }

  await promotion.update(updatedPayload);

  if (payload.menu_item_ids || payload.menu_item_id !== undefined) {
    const menuItemIds = computeMenuItemIdsFromPayload(payload);
    await assignMenuItems(promotion, menuItemIds, payload.restaurant_id || promotion.restaurant_id);
  }

  return promotion.reload({ include: promotionIncludes });
};

export const deletePromotion = async (id) => {
  await PromotionMenuItem.destroy({ where: { promotion_id: id } });
  return Promotion.destroy({ where: { id } });
};
