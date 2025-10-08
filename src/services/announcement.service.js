import Announcement from "../models/Announcement.js";
import { Op } from "sequelize";

// Create a new announcement
export const createAnnouncement = async (data) => {
  return Announcement.create(data);
};

// Get all announcements
export const getAllAnnouncements = async () => {
  return Announcement.findAll({
    order: [["created_at", "DESC"]],
  });
};

// Get active announcements
export const getActiveAnnouncements = async () => {
  const now = new Date();

  const announcements = await Announcement.findAll({
    where: {
      is_active: true
    },
    order: [["created_at", "DESC"]],
  });

  return announcements;
};

// Update announcement
export const updateAnnouncement = async (id, data) => {
  const announcement = await Announcement.findOne({ where: { id } });
  if (!announcement) return null;

  await announcement.update(data);
  return announcement;
};

// Delete announcement
export const deleteAnnouncement = async (id) => {
  return Announcement.destroy({ where: { id } });
};
