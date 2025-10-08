import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";

// CREATE ORDER ITEM
export async function createOrderItem(data) {
  const { order_id, menu_item_id, quantite = 1, instructions_speciales } = data;

  // Verify order exists
  const order = await Order.findByPk(order_id);
  if (!order) throw { status: 404, message: "Order not found" };

  // Only allow adding items to pending orders
  if (order.status !== 'pending') {
    throw { status: 400, message: "Cannot add items to confirmed orders" };
  }

  // Verify menu item exists and is available
  const menuItem = await MenuItem.findByPk(menu_item_id);
  if (!menuItem) throw { status: 404, message: "Menu item not found" };
  if (!menuItem.is_available) {
    throw { status: 400, message: "Menu item is not available" };
  }

  // Create order item (prix_total auto-calculated by hook)
  const orderItem = await OrderItem.create({
    order_id,
    menu_item_id,
    quantite,
    prix_unitaire: menuItem.prix,
    instructions_speciales
  });

  // Update order subtotal and total
  await updateOrderSubtotal(order_id);

  // Return with menu item details
  return await OrderItem.findByPk(orderItem.id, {
    include: [{ model: MenuItem, as: "menu_item" }]
  });
}

// GET ALL ORDER ITEMS
export async function getAllOrderItems() {
  return await OrderItem.findAll({
    include: [
      { model: MenuItem, as: "menu_item" },
      { model: Order, as: "order", attributes: ['id', 'order_number', 'status'] }
    ],
    order: [["created_at", "DESC"]]
  });
}

// GET ORDER ITEM BY ID
export async function getOrderItemById(id) {
  const orderItem = await OrderItem.findByPk(id, {
    include: [
      { model: MenuItem, as: "menu_item" },
      { model: Order, as: "order" }
    ]
  });

  if (!orderItem) throw { status: 404, message: "Order item not found" };
  return orderItem;
}

// GET ORDER ITEMS BY ORDER ID
export async function getOrderItemsByOrderId(order_id) {
  const order = await Order.findByPk(order_id);
  if (!order) throw { status: 404, message: "Order not found" };

  return await OrderItem.findAll({
    where: { order_id },
    include: [{ model: MenuItem, as: "menu_item" }],
    order: [["created_at", "ASC"]]
  });
}

// UPDATE ORDER ITEM
export async function updateOrderItem(id, updates) {
  const item = await OrderItem.findByPk(id);
  if (!item) throw { status: 404, message: "Order item not found" };

  // Check if order can be modified
  const order = await Order.findByPk(item.order_id);
  if (order.status !== 'pending') {
    throw { status: 400, message: "Cannot modify confirmed orders" };
  }

  // Only allow updating quantity and special instructions
  const allowedUpdates = {};
  if (updates.quantite !== undefined) {
    if (updates.quantite < 1) {
      throw { status: 400, message: "Quantity must be at least 1" };
    }
    allowedUpdates.quantite = updates.quantite;
  }
  if (updates.instructions_speciales !== undefined) {
    allowedUpdates.instructions_speciales = updates.instructions_speciales;
  }

  await item.update(allowedUpdates);

  // Update order subtotal
  await updateOrderSubtotal(item.order_id);

  return await OrderItem.findByPk(id, {
    include: [{ model: MenuItem, as: "menu_item" }]
  });
}

// DELETE ORDER ITEM
export async function deleteOrderItem(id) {
  const item = await OrderItem.findByPk(id);
  if (!item) throw { status: 404, message: "Order item not found" };

  // Check if order can be modified
  const order = await Order.findByPk(item.order_id);
  if (order.status !== 'pending') {
    throw { status: 400, message: "Cannot delete items from confirmed orders" };
  }

  const order_id = item.order_id;
  await item.destroy();

  // Update order subtotal
  await updateOrderSubtotal(order_id);

  return { message: "Order item deleted successfully" };
}

// BULK CREATE ORDER ITEMS (for new orders)
export async function bulkCreateOrderItems(order_id, items) {
  const order = await Order.findByPk(order_id);
  if (!order) throw { status: 404, message: "Order not found" };

  if (order.status !== 'pending') {
    throw { status: 400, message: "Cannot add items to confirmed orders" };
  }

  // Validate all menu items exist and are available
  const menuItemIds = items.map(i => i.menu_item_id);
  const menuItems = await MenuItem.findAll({ where: { id: menuItemIds } });
  
  if (menuItems.length !== menuItemIds.length) {
    throw { status: 404, message: "One or more menu items not found" };
  }

  const menuMap = new Map(menuItems.map(m => [m.id, m]));

  // Prepare order items data
  const orderItemsData = items.map(item => {
    const menuItem = menuMap.get(item.menu_item_id);
    
    if (!menuItem.is_available) {
      throw { status: 400, message: `${menuItem.nom} is not available` };
    }

    if (!item.quantite || item.quantite < 1) {
      throw { status: 400, message: "Quantity must be at least 1" };
    }

    return {
      order_id,
      menu_item_id: item.menu_item_id,
      quantite: item.quantite,
      prix_unitaire: menuItem.prix,
      instructions_speciales: item.instructions_speciales || null
    };
  });

  // Create all items
  const created = await OrderItem.bulkCreate(orderItemsData);

  // Update order subtotal
  await updateOrderSubtotal(order_id);

  return created;
}

// HELPER: Update order subtotal and total
async function updateOrderSubtotal(order_id) {
  const items = await OrderItem.findAll({
    where: { order_id },
    attributes: ['prix_total']
  });

  const subtotal = items.reduce((sum, item) => {
    return sum + parseFloat(item.prix_total || 0);
  }, 0);

  const order = await Order.findByPk(order_id);
  if (order) {
    order.subtotal = subtotal;
    order.calculateTotal(); // Also updates total_amount with delivery fee
    await order.save();
  }
}