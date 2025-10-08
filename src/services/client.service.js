import Client from "../models/Client.js";

// Create
export const createClient = async (data) => {
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

  return Client.create({
    first_name,
    last_name,
    email,
    phone_number,
    address,
    location: lat && lng
      ? { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] }
      : null,
    profile_image_url,
    loyalty_points,
    is_verified,
    is_active,
    status
  });
};

// Get all
export const getAllClients = async () => {
  const clients = await Client.findAll({
    order: [["created_at", "DESC"]],
  });

  return clients.map(c => ({
    ...c.toJSON(),
    full_name: c.getFullName(),
  }));
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
    phone_number,
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
