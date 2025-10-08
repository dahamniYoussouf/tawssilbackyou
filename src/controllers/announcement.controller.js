import {
  createAnnouncement,
  getAllAnnouncements,
  getActiveAnnouncements,
  updateAnnouncement,
  deleteAnnouncement
} from "../services/announcement.service.js";

// Create
export const create = async (req, res, next) => {
  try {
    const announcement = await createAnnouncement(req.body);
    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (err) {
    next(err);
  }
};

// Get all
export const getAll = async (req, res, next) => {
  try {
    const announcements = await getAllAnnouncements();
    res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
};

// Get active
export const getActive = async (req, res, next) => {
  try {
    const activeAnnouncements = await getActiveAnnouncements();

    res.status(200).json({
      success: true,
      data: activeAnnouncements,
    });
  } catch (err) {
    console.error("Error fetching active announcements:", err);
    next(err);
  }
};

// Update
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await updateAnnouncement(id, req.body);

    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    res.json({ success: true, message: "Announcement updated successfully" });
  } catch (err) {
    next(err);
  }
};

// Delete
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteAnnouncement(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    res.status(200).json({ success: true, message: "Announcement deleted successfully" });
  } catch (err) {
    next(err);
  }
};
