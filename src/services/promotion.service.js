import { Op } from "sequelize";
import MenuItem from "../models/MenuItem.js";
import Promotion from "../models/Promotion.js";
import PromotionMenuItem from "../models/PromotionMenuItem.js";
import Restaurant from "../models/Restaurant.js";
import FoodCategory from "../models/FoodCategory.js";

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
      return payload.badge_text || payload.custom_message || "Offre spéciale";
    case "other":
      return payload.custom_message?.slice(0, 80) || "Offre spéciale";
    default:
      return null;
  }
};

const fetchMenuItemsAndValidate = async (ids = [], restaurantId) => {
  if (!ids.length) return [];
  const menuItems = await MenuItem.findAll({
    where: { id: ids },
    include: [
      {
        model: FoodCategory,
        as: "category",
        attributes: ["restaurant_id"]
      }
    ]
  });

  if (menuItems.length !== ids.length) {
    throw new Error("One or more menu items do not exist");
  }

  const normalizedRestaurantId =
    restaurantId === undefined || restaurantId === null
      ? null
      : String(restaurantId).trim();

  if (normalizedRestaurantId) {
    menuItems.forEach((item) => {
      const itemRestaurantId =
        item.restaurant_id ??
        item.category?.restaurant_id ??
        null;
      if (String(itemRestaurantId) !== normalizedRestaurantId) {
        throw new Error("All menu items must belong to the same restaurant");
      }
    });
  }

  return menuItems;
};

const computeMenuItemIdsFromPayload = (payload) => {
  const ids = new Set(payload.menu_item_ids || []);
  if (payload.menu_item_id) {
    ids.add(payload.menu_item_id);
  }
  return Array.from(ids);
};

const registerMenuItemPromotionConflict = (conflicts, menuItemId, promotion) => {
  if (!menuItemId || !promotion?.id) {
    return;
  }
  const key = String(menuItemId);
  const existing = conflicts.get(key) ?? [];
  const alreadyTracked = existing.some((entry) => String(entry.id) === String(promotion.id));
  if (alreadyTracked) {
    return;
  }
  conflicts.set(key, [...existing, { id: promotion.id, title: promotion.title }]);
};

const collectMenuItemPromotionConflicts = async (menuItemIds, excludePromotionId) => {
  if (!menuItemIds.length) {
    return [];
  }

  const conflicts = new Map();
  const promotionInclude = {
    model: Promotion,
    as: "promotion",
    required: true,
    attributes: ["id", "title"]
  };

  if (excludePromotionId) {
    promotionInclude.where = { id: { [Op.ne]: excludePromotionId } };
  }

  const linkedEntries = await PromotionMenuItem.findAll({
    where: { menu_item_id: menuItemIds },
    include: [promotionInclude],
    attributes: ["menu_item_id"]
  });

  linkedEntries.forEach((entry) => {
    registerMenuItemPromotionConflict(conflicts, entry.menu_item_id, entry.promotion);
  });

  const directWhere = { menu_item_id: menuItemIds };
  if (excludePromotionId) {
    directWhere.id = { [Op.ne]: excludePromotionId };
  }

  const directPromotions = await Promotion.findAll({
    where: directWhere,
    attributes: ["id", "title", "menu_item_id"]
  });

  directPromotions.forEach((promotion) => {
    registerMenuItemPromotionConflict(conflicts, promotion.menu_item_id, promotion);
  });

  return Array.from(conflicts.entries()).map(([menuItemId, promotions]) => ({
    menuItemId,
    promotions
  }));
};

const ensureMenuItemsAreNotInOtherPromotions = async (menuItems = [], excludePromotionId) => {
  if (!menuItems.length) {
    return;
  }

  const menuItemIds = menuItems.map((item) => item.id);
  const conflicts = await collectMenuItemPromotionConflicts(menuItemIds, excludePromotionId);
  if (!conflicts.length) {
    return;
  }

  const menuItemLookup = new Map(menuItems.map((item) => [String(item.id), item]));
  const conflictMessages = conflicts.map(({ menuItemId, promotions }) => {
    const menuItem = menuItemLookup.get(String(menuItemId));
    const label = menuItem?.nom ?? menuItemId;
    const promotionsList = promotions
      .map((promotion) => (promotion.title ? `${promotion.title} (${promotion.id})` : String(promotion.id)))
      .join(", ");
    return `${label} (${menuItemId}): ${promotionsList}`;
  });

  throw new Error(
    `Some menu items are already linked to another promotion: ${conflictMessages.join("; ")}`
  );
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

  const menuItemIds = computeMenuItemIdsFromPayload(payload);
  let menuItems = [];
  if (menuItemIds.length) {
    menuItems = await fetchMenuItemsAndValidate(menuItemIds, payload.restaurant_id);
    await ensureMenuItemsAreNotInOtherPromotions(menuItems);
  }

  const promotion = await Promotion.create(promotionPayload);
  if (menuItems.length) {
    await promotion.setMenu_items(menuItems);
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

  const shouldUpdateMenuItems =
    payload.menu_item_ids !== undefined || payload.menu_item_id !== undefined;
  let menuItems = [];
  if (shouldUpdateMenuItems) {
    const menuItemIds = computeMenuItemIdsFromPayload(payload);
    if (menuItemIds.length) {
      const targetRestaurantId = payload.restaurant_id || promotion.restaurant_id;
      menuItems = await fetchMenuItemsAndValidate(menuItemIds, targetRestaurantId);
      await ensureMenuItemsAreNotInOtherPromotions(menuItems, promotion.id);
    }
  }

  await promotion.update(updatedPayload);

  if (shouldUpdateMenuItems) {
    await promotion.setMenu_items(menuItems);
  }

  return promotion.reload({ include: promotionIncludes });
};

export const deletePromotion = async (id) => {
  await PromotionMenuItem.destroy({ where: { promotion_id: id } });
  return Promotion.destroy({ where: { id } });
};
