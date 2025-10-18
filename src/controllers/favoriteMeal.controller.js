import { 
  addFavoriteMealService,
  removeFavoriteMealService,
  getFavoriteMealsService,
  updateFavoriteMealService
} from "../services/favoriteMeal.service.js";

// Add a meal to favorites
export const addFavoriteMeal = async (req, res, next) => {
  try {
    const client_id = req.user.client_id;  // ✅ from protect middleware
    const { meal_id } = req.body;

    if (!client_id || !meal_id) {
      return res.status(400).json({ success: false, error: "client_id and meal_id are required" });
    }

    const result = await addFavoriteMealService({ client_id, meal_id, ...req.body });

    if (result.error) {
      return res.status(result.status).json({ success: false, error: result.error, favorite_uuid: result.favorite_uuid });
    }

    res.status(201).json({
      success: true,
      message: "Meal added to favorites",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const removeFavoriteMeal = async (req, res, next) => {
  try {
    const { favorite_uuid } = req.params;
    const removed = await removeFavoriteMealService(favorite_uuid);

    if (!removed) {
      return res.status(404).json({ success: false, error: "Favorite not found" });
    }

    res.json({ success: true, message: "Meal removed from favorites" });
  } catch (err) {
    next(err);
  }
};

// Get all favorite meals
export const getFavoriteMeals = async (req, res, next) => {
  try {
    const client_id = req.user.client_id;  // ✅ from protect middleware

    const favorites = await getFavoriteMealsService(client_id);

    res.json({
      success: true,
      count: favorites.length,
      data: favorites.map(fav => ({
        favorite_uuid: fav.id,
        customizations: fav.customizations,
        notes: fav.notes,
        added_at: fav.created_at,
        meal: fav.meal,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// Update favorite meal
export const updateFavoriteMeal = async (req, res, next) => {
  try {
    const { favorite_uuid } = req.params;
    const updated = await updateFavoriteMealService(favorite_uuid, req.body);

    if (!updated) {
      return res.status(404).json({ success: false, error: "Favorite not found" });
    }

    res.json({
      success: true,
      message: "Favorite updated",
      data: {
        favorite_uuid: updated.id,
        customizations: updated.customizations,
        notes: updated.notes,
        updated_at: updated.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
};
