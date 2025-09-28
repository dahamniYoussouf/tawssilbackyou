import Announcement from "../models/Announcement.js";

// ----------------------------
// Create a new announcement
// ----------------------------
export const create = async (req, res, next) => {
  try {
    const {
      title,
      content,
      css_styles,
      js_scripts,
      type,
      is_active,
      start_date,
      end_date
    } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      css_styles,
      js_scripts,
      type,
      is_active,
      start_date,
      end_date
    });

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Get all announcements
// ----------------------------
export const getAll = async (req, res, next) => {
  try {
    const announcements = await Announcement.findAll({
      order: [["created_at", "DESC"]]
    });

    res.json({
      success: true,
      data: announcements
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Get active announcements only
// ----------------------------
export const getActive = async (req, res, next) => {
  try {
    const announcements = await Announcement.findAll({
      where: { is_active: true },
      order: [["created_at", "DESC"]]
    });

    const activeAnnouncements = announcements.filter(a => a.isCurrentlyActive());

    res.json({
      success: true,
      data: activeAnnouncements
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Update announcement
// ----------------------------
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      css_styles,
      js_scripts,
      type,
      is_active,
      start_date,
      end_date
    } = req.body;

    const announcement = await Announcement.findOne({ where: { id } });

    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    await announcement.update({
      title,
      content,
      css_styles,
      js_scripts,
      type,
      is_active,
      start_date,
      end_date
    });

    res.json({
      success: true,
      message: "Announcement updated successfully"
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Delete announcement
// ----------------------------
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Announcement.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};