import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";

// Create a new Order item
export const create = async (req, res, next) => {
  try {
    const { order_id, menu_item_id, quantite, prix_unitaire, prix_total, instructions_speciales, customizations, statut } = req.body;

     // Vérifier que la commande existe
    const order = await Order.findByPk(order_id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Vérifier que le menu item existe
    const menuItem = await MenuItem.findByPk(menu_item_id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found"
      });
    }

    const orderItem = await OrderItem.create({
      order_id,
      menu_item_id,
      quantite,
      prix_unitaire,
      prix_total,
      instructions_speciales,
      customizations,
      statut,
    });

    res.status(201).json({
      success: true,
      data: orderItem,
    });
  } catch (err) {
    next(err);
  }
};

// Get all Order items
export const getAll = async (req, res, next) => {
  try {
    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          attributes: ['id', 'nom', 'description', 'photo_url']
        }
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: orderItems,
    });
  } catch (err) {
    next(err);
  }
};

// Get order items by order ID
export const getByOrderId = async (req, res, next) => {
  try {
    const { order_id } = req.params;

    const orderItems = await OrderItem.findAll({
      where: { order_id },
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          attributes: ['id', 'nom', 'description', 'photo_url']
        }
      ],
      order: [["created_at", "ASC"]],
    });

    res.json({
      success: true,
      data: orderItems,
    });
  } catch (err) {
    next(err);
  }
};

// Get a single Order item by UUID
export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderItem = await OrderItem.findOne({
      where: { id },
      include: [
        {
          model: MenuItem,
          as: 'menuItem',
          attributes: ['id', 'nom', 'description', 'photo_url']
        }
      ],
    });

    if (!orderItem) {
      return res
        .status(404)
        .json({ success: false, message: "Order item not found" });
    }

    res.json({
      success: true,
      data: orderItem,
    });
  } catch (err) {
    next(err);
  }
};

// Update an Order item by UUID
export const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { quantite, prix_unitaire, prix_total, instructions_speciales, customizations, statut } = req.body;

    const orderItem = await OrderItem.findOne({ where: { id } });

    if (!orderItem) {
      return res
        .status(404)
        .json({ success: false, message: "Order item not found" });
    }

    await orderItem.update({
      quantite,
      prix_unitaire,
      prix_total,
      instructions_speciales,
      customizations,
      statut,
    });

    res.json({
      success: true,
      data: orderItem,
    });
  } catch (err) {
    next(err);
  }
};

// Update order item status
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const orderItem = await OrderItem.findOne({ where: { id } });

    if (!orderItem) {
      return res
        .status(404)
        .json({ success: false, message: "Order item not found" });
    }

    await orderItem.update({ statut });

    res.json({
      success: true,
      data: orderItem,
      message: `Order item status updated to ${statut}`,
    });
  } catch (err) {
    next(err);
  }
};

// Delete an Order item by UUID
export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await OrderItem.destroy({ where: { id } });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Order item not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order item deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};