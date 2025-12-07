import * as additionService from "../services/addition.service.js";

export const create = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    const addition = await additionService.createAddition(req.body, restaurant_id);
    res.status(201).json({ success: true, data: addition });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "Failed to create addition" });
  }
};

export const update = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    const updated = await additionService.updateAddition(req.params.id, req.body, restaurant_id);
    res.json({ success: true, data: updated });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "Failed to update addition" });
  }
};

export const remove = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    const result = await additionService.deleteAddition(req.params.id, restaurant_id);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "Failed to delete addition" });
  }
};

export const getByMenuItem = async (req, res, next) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    if (!restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant ID not found in token"
      });
    }

    const additions = await additionService.getAdditionsByMenuItem(req.params.menu_item_id, restaurant_id);
    res.json({ success: true, data: additions });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "Failed to fetch additions" });
  }
};
