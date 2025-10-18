import {
  addFavoriteRestaurantService,
  removeFavoriteRestaurantService,
  getFavoriteRestaurantsService,
  updateFavoriteRestaurantService
} from "../services/favoriteRestaurant.service.js";

// ⭐ Add a restaurant to favorites
export const addFavoriteRestaurant = async (req, res, next) => {
  try {
    const client_id = req.user.client_id; // ✅ from protect middleware
    const { restaurant_id } = req.body;

    if (!client_id || !restaurant_id) {
      return res.status(400).json({ success: false, error: "client_id and restaurant_id are required" });
    }

    const result = await addFavoriteRestaurantService({ client_id, restaurant_id, ...req.body });

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        error: result.error,
        favorite_uuid: result.favorite_uuid,
      });
    }

    res.status(201).json({
      success: true,
      message: "Restaurant added to favorites",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ❌ Remove a restaurant from favorites
export const removeFavoriteRestaurant = async (req, res, next) => {
  try {
    const { favorite_uuid } = req.params;
    const removed = await removeFavoriteRestaurantService(favorite_uuid);

    if (!removed) {
      return res.status(404).json({ success: false, error: "Favorite not found" });
    }

    res.json({ success: true, message: "Restaurant removed from favorites" });
  } catch (err) {
    next(err);
  }
};

// 📋 Get all favorite restaurants for a client
export const getFavoriteRestaurants = async (req, res, next) => {
  try {
    const client_id = req.user.client_id; // ✅ from protect middleware
    const favorites = await getFavoriteRestaurantsService(client_id);

    res.json({
      success: true,
      count: favorites.length,
      data: favorites.map(fav => ({
        favorite_uuid: fav.id,
        notes: fav.notes,
        tags: fav.tags,
        added_at: fav.created_at,
        restaurant: fav.restaurant,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// 🔄 Update notes/tags of a favorite
export const updateFavoriteRestaurant = async (req, res, next) => {
  try {
    const { favorite_uuid } = req.params;
    const updated = await updateFavoriteRestaurantService(favorite_uuid, req.body);

    if (!updated) {
      return res.status(404).json({ success: false, error: "Favorite not found" });
    }

    res.json({
      success: true,
      message: "Updated favorite",
      data: {
        favorite_uuid: updated.id,
        notes: updated.notes,
        tags: updated.tags,
        updated_at: updated.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
};
