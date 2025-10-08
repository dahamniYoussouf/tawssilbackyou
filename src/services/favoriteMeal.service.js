import FavoriteMeal from "../models/FavoriteMeal.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";

// ⭐ Add favorite meal
export const addFavoriteMealService = async ({ client_id, meal_id, customizations, notes }) => {
  // Check if meal exists
  const meal = await MenuItem.findByPk(meal_id);
  if (!meal) {
    return { error: "Meal not found", status: 404 };
  }

  // Check if already in favorites
  const existingFavorite = await FavoriteMeal.findOne({
    where: { client_id, meal_id },
  });

  if (existingFavorite) {
    return { error: "This meal is already in your favorites", status: 409, favorite_uuid: existingFavorite.id };
  }

  // Create favorite
  const favorite = await FavoriteMeal.create({
    client_id,
    meal_id,
    customizations: customizations || null,
    notes: notes || null,
  });

  // Include meal info
  const favoriteWithMeal = await FavoriteMeal.findByPk(favorite.id, {
    include: [
      {
        model: MenuItem,
        as: "meal",
        attributes: ["id", "nom", "description", "prix", "photo_url", "category_id"],
        include: [
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["id", "name", "address", "rating"],
          },
        ],
      },
    ],
  });

  return {
    favorite_uuid: favorite.id,
    client_id: favorite.client_id,
    meal_id: favorite.meal_id,
    customizations: favorite.customizations,
    notes: favorite.notes,
    created_at: favorite.created_at,
    meal: favoriteWithMeal.meal,
  };
};

// ❌ Remove favorite meal
export const removeFavoriteMealService = async (favorite_uuid) => {
  const favorite = await FavoriteMeal.findByPk(favorite_uuid);
  if (!favorite) return null;

  await favorite.destroy();
  return true;
};

// 📋 Get all favorite meals for a client
export const getFavoriteMealsService = async (client_id) => {
  return FavoriteMeal.findAll({
    where: { client_id },
    include: [
      {
        model: MenuItem,
        as: "meal",
        attributes: ["id", "nom", "description", "prix", "photo_url", "category_id"],
        include: [
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["id", "name", "address", "rating", "image_url"],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

// 🔄 Update favorite meal
export const updateFavoriteMealService = async (favorite_uuid, { customizations, notes }) => {
  const favorite = await FavoriteMeal.findByPk(favorite_uuid);
  if (!favorite) return null;

  if (customizations !== undefined) favorite.customizations = customizations;
  if (notes !== undefined) favorite.notes = notes;

  await favorite.save();
  return favorite;
};
