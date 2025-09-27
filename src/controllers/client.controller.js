import Client from "../models/Client.js";

// ----------------------------
// Create a new client
// ----------------------------
export const create = async (req, res, next) => {
  try {
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
    } = req.body;

    const client = await Client.create({
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

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: client
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Get all clients
// ----------------------------
export const getAll = async (req, res, next) => {
  try {
    const clients = await Client.findAll({
      order: [["created_at", "DESC"]]
    });

    const formatted = clients.map(c => ({
      ...c.toJSON(),
      full_name: c.getFullName()
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Update client
// ----------------------------
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
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
    } = req.body;

    const client = await Client.findOne({ where: { id } });

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

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

    res.json({
      success: true,
      message: "Client updated successfully"
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------
// Delete client
// ----------------------------
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Client.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    res.status(200).json({
      success: true,
      message: "Client deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};
