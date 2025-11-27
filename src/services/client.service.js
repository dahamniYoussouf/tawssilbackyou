import Client from "../models/Client.js";
import { Op } from "sequelize";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";


// Get all with pagination
export const getAllClients = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    is_active,
    is_verified
  } = filters;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where = {};

  // Search filter
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone_number: { [Op.iLike]: `%${search}%` } }
    ];
  }

  // Status filters
  if (is_active !== undefined) {
    where.is_active = is_active === 'true' || is_active === true;
  }

  if (is_verified !== undefined) {
    where.is_verified = is_verified === 'true' || is_verified === true;
  }

  const { count, rows } = await Client.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: parseInt(limit, 10),
    offset
  });

  const clients = rows.map(c => ({
    ...c.toJSON(),
    full_name: c.getFullName(),
  }));

  return {
    clients,
    pagination: {
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(count / parseInt(limit, 10)),
      total_items: count,
      items_per_page: parseInt(limit, 10)
    }
  };
};

// Update
export const updateClient = async (id, data) => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    address,
    lat,
    lng,
    profile_image_url,
    loyalty_points,
    is_verified,
    is_active,
    status
  } = data;

  const client = await Client.findOne({ where: { id } });
  if (!client) return null;

  await client.update({
    first_name,
    last_name,
    email,
    phone_number: phone_number ? normalizePhoneNumber(phone_number) : phone_number,
    address,
    location: lat && lng
      ? { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] }
      : client.location,
    profile_image_url,
    loyalty_points,
    is_verified,
    is_active,
    status
  });

  return client;
};

// Delete
export const deleteClient = async (id) => {
  return Client.destroy({ where: { id } });
};
