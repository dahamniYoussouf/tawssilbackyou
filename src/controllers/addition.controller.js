import * as additionService from "../services/addition.service.js";

const resolveRestaurantId = (req) => {
  if (req.user.role === "admin") {
    const candidate =
      req.body?.restaurant_id || req.query?.restaurant_id;
    if (!candidate) {
      const error = new Error("restaurant_id is required for admin operations");
      error.status = 400;
      throw error;
    }
    return candidate;
  }

  if (!req.user.restaurant_id) {
    const error = new Error("Restaurant ID not found in token");
    error.status = 403;
    throw error;
  }

  return req.user.restaurant_id;
};

export const create = async (req, res, next) => {
  try {
    const restaurant_id = resolveRestaurantId(req);

    const addition = await additionService.createAddition(req.body, restaurant_id);
    res.status(201).json({ success: true, data: addition });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "Failed to create addition" });
  }
};

export const update = async (req, res, next) => {
  try {
    const restaurant_id = resolveRestaurantId(req);

    const updated = await additionService.updateAddition(req.params.id, req.body, restaurant_id);
    res.json({ success: true, data: updated });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "Failed to update addition" });
  }
};

export const remove = async (req, res, next) => {
  try {
    const restaurant_id = resolveRestaurantId(req);

    const result = await additionService.deleteAddition(req.params.id, restaurant_id);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "Failed to delete addition" });
  }
};

export const getByMenuItem = async (req, res, next) => {
  try {
    const restaurant_id = resolveRestaurantId(req);

    const additions = await additionService.getAdditionsByMenuItem(req.params.menu_item_id, restaurant_id);
    res.json({ success: true, data: additions });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "Failed to fetch additions" });
  }
};
