import {
  createClient,
  getAllClients,
  updateClient,
  deleteClient
} from "../services/client.service.js";

// Create
export const create = async (req, res, next) => {
  try {
    const client = await createClient(req.body);
    res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: client,
    });
  } catch (err) {
    //  errors Sequelize
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
        field: err.errors[0].path,
        value: err.errors[0].value
      });
    }

    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    next(err); // autre erreur => middleware global
  }
};

// Get all
export const getAll = async (req, res, next) => {
  try {
    const clients = await getAllClients();
    res.json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
};

// Update
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await updateClient(id, req.body);

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    res.json({ success: true, message: "Client updated successfully" });
  } catch (err) {
    //  errors Sequelize
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
        field: err.errors[0].path,
        value: err.errors[0].value
      });
    }

    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    next(err); // autre erreur => middleware global
  }
};

// Delete
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteClient(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    res.status(200).json({ success: true, message: "Client deleted successfully" });
  } catch (err) {
    next(err);
  }
};
