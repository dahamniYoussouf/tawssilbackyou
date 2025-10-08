import FavoriteRestaurant from "../models/FavoriteRestaurant.js";
import Restaurant from "../models/Restaurant.js";

// ⭐ Add favorite restaurant
export const addFavoriteRestaurantService = async ({ client_id, restaurant_id, notes, tags }) => {
  // Check if restaurant exists
  const restaurant = await Restaurant.findByPk(restaurant_id);
  if (!restaurant) return { error: "Restaurant not found", status: 404 };

  // Check if already in favorites
  const existingFavorite = await FavoriteRestaurant.findOne({
    where: { client_id, restaurant_id },
  });
  if (existingFavorite) {
    return { error: "This restaurant is already in your favorites", status: 409, favorite_uuid: existingFavorite.id };
  }

  // Create favorite
  const favorite = await FavoriteRestaurant.create({
    client_id,
    restaurant_id,
    notes: notes || null,
    tags: tags || [],
  });

  // Include restaurant info
  const favoriteWithRestaurant = await FavoriteRestaurant.findByPk(favorite.id, {
    include: [
      {
        model: Restaurant,
        as: "restaurant",
        attributes: ["id", "name", "address", "rating", "image_url"],
      },
    ],
  });

  return {
    favorite_uuid: favorite.id,
    client_id: favorite.client_id,
    restaurant_id: favorite.restaurant_id,
    notes: favorite.notes,
    tags: favorite.tags,
    created_at: favorite.created_at,
    restaurant: favoriteWithRestaurant.restaurant,
  };
};

// ❌ Remove favorite restaurant
export const removeFavoriteRestaurantService = async (favorite_uuid) => {
  const favorite = await FavoriteRestaurant.findByPk(favorite_uuid);
  if (!favorite) return null;

  await favorite.destroy();
  return true;
};

// 📋 Get all favorite restaurants for a client
export const getFavoriteRestaurantsService = async (client_id) => {
  return FavoriteRestaurant.findAll({
    where: { client_id },
    include: [
      {
        model: Restaurant,
        as: "restaurant",
        attributes: [
          "id",
          "name",
          "description",
          "address",
          "rating",
          "image_url",
          "is_premium",
          "status",
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

// 🔄 Update favorite restaurant
export const updateFavoriteRestaurantService = async (favorite_uuid, { notes, tags }) => {
  const favorite = await FavoriteRestaurant.findByPk(favorite_uuid);
  if (!favorite) return null;

  if (notes !== undefined) favorite.notes = notes;
  if (tags !== undefined) favorite.tags = tags;

  await favorite.save();
  return favorite;
};
