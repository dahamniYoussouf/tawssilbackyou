import MenuItem from "../models/MenuItem.js";
import RecommendedDish from "../models/RecommendedDish.js";
import Restaurant from "../models/Restaurant.js";
import FoodCategory from "../models/FoodCategory.js";

const ensurePremiumRestaurant = async (restaurant_id) => {
  const restaurant = await Restaurant.findByPk(restaurant_id);
  if (!restaurant) {
    throw new Error("Restaurant not found");
  }
  if (!restaurant.is_premium) {
    throw new Error("Recommended dishes can only be created for premium restaurants");
  }
  return restaurant;
};

const ensureMenuItemMatchesRestaurant = async (menu_item_id, restaurant_id) => {
  const menuItem = await MenuItem.findByPk(menu_item_id, {
    include: [
      {
        model: FoodCategory,
        as: "category",
        attributes: ["restaurant_id"]
      }
    ]
  });
  if (!menuItem) {
    throw new Error("Menu item not found");
  }

  const itemRestaurantId =
    menuItem.restaurant_id ?? menuItem.category?.restaurant_id ?? null;

  if (restaurant_id && String(itemRestaurantId) !== String(restaurant_id)) {
    throw new Error("Menu item does not belong to the provided restaurant");
  }

  return menuItem;
};

export const listRecommendedDishes = async (options = {}) => {
  const where = {};
  if (options.activeOnly) {
    where.is_active = true;
  }

  return RecommendedDish.findAll({
    where,
    include: [
      {
        model: Restaurant,
        as: "restaurant",
        attributes: ["id", "name", "is_premium"]
      },
      {
        model: MenuItem,
        as: "menu_item",
        attributes: ["id", "nom", "prix", "photo_url"]
      }
    ],
    order: [["created_at", "DESC"]]
  });
};

export const createRecommendedDish = async (payload) => {
  await ensurePremiumRestaurant(payload.restaurant_id);
  await ensureMenuItemMatchesRestaurant(payload.menu_item_id, payload.restaurant_id);
  return RecommendedDish.create(payload);
};

export const getRecommendedDishById = async (id) => {
  return RecommendedDish.findByPk(id);
};

export const updateRecommendedDish = async (id, payload) => {
  const dish = await getRecommendedDishById(id);
  if (!dish) return null;

  if (payload.restaurant_id) {
    await ensurePremiumRestaurant(payload.restaurant_id);
  }

  if (payload.menu_item_id) {
    await ensureMenuItemMatchesRestaurant(
      payload.menu_item_id,
      payload.restaurant_id || dish.restaurant_id
    );
  }

  await dish.update(payload);
  return dish.reload({
    include: [
      {
        model: Restaurant,
        as: "restaurant",
        attributes: ["id", "name", "is_premium"]
      },
      {
        model: MenuItem,
        as: "menu_item",
        attributes: ["id", "nom", "prix", "photo_url"]
      }
    ]
  });
};

export const deleteRecommendedDish = async (id) => {
  return RecommendedDish.destroy({ where: { id } });
};
