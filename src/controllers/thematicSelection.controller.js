import {
  createThematicSelection,
  deleteThematicSelection,
  listThematicSelections,
  updateThematicSelection
} from "../services/thematicSelection.service.js";
import { clearHomepageModulesCache } from "../services/homepage.service.js";

export const getSelections = async (req, res, next) => {
  try {
    const selections = await listThematicSelections();
    res.json({ success: true, data: selections });
  } catch (err) {
    next(err);
  }
};

export const createSelection = async (req, res, next) => {
  try {
    const selection = await createThematicSelection(req.body);
    await clearHomepageModulesCache();
    res.status(201).json({ success: true, data: selection });
  } catch (err) {
    next(err);
  }
};

export const updateSelection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await updateThematicSelection(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Selection not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const removeSelection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteThematicSelection(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Selection not found" });
    }
    await clearHomepageModulesCache();
    res.json({ success: true, message: "Selection deleted successfully" });
  } catch (err) {
    next(err);
  }
};
