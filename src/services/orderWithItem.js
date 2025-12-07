import { sequelize } from "../config/database.js";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import OrderItemAddition from "../models/OrderItemAddition.js";
import MenuItem from "../models/MenuItem.js";
import Addition from "../models/Addition.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import calculateRouteTime from "../services/routingService.js";
import { emit } from "../config/socket.js";
import { scheduleAdminNotification } from "../services/order.service.js";

// Helper to notify
function notify(type, id, data) {
  emit(`${type}:${id}`, "notification", data);
}

/**
 * CREATE ORDER WITH ITEMS IN A SINGLE TRANSACTION
 * ✅ NOW SUPPORTS NULL client_id FOR PICKUP ORDERS (POS)
 */
export async function createOrderWithItems(data) {
  const {
    client_id, // ✅ CAN BE NULL FOR POS PICKUP ORDERS
    restaurant_id,
    order_type = 'pickup', // Default to pickup for POS
    delivery_address,
    lat,
    lng,
    delivery_fee = 0,
    payment_method,
    delivery_instructions,
    estimated_delivery_time,
    items = []
  } = data;

  if (!items.length) {
    throw { status: 400, message: "Order must contain at least one item" };
  }

  // Validate: client_id required ONLY for delivery orders
  if (order_type === 'delivery') {
    if (!client_id) {
      throw { status: 400, message: "client_id is required for delivery orders" };
    }
    if (!delivery_address) {
      throw { status: 400, message: "Delivery address is required for delivery orders" };
    }
  }

  const menuItemIds = items
    .map(i => i.menu_item_id)
    .filter(id => !!id);
  const additionIds = items.flatMap(i => (i.additions || []).map(a => a.addition_id)).filter(Boolean);

  // Restaurant validation (always required)
  const [restaurant, menuItems, additions] = await Promise.all([
    Restaurant.findByPk(restaurant_id, {
      attributes: ['id', 'location'],
      raw: true
    }),
    MenuItem.findAll({
      where: { id: menuItemIds },
      attributes: ['id', 'nom', 'prix', 'is_available']
    }),
    additionIds.length
      ? Addition.findAll({
          where: { id: additionIds },
          attributes: ['id', 'menu_item_id', 'nom', 'prix', 'is_available']
        })
      : Promise.resolve([])
  ]);

  if (!restaurant) throw { status: 404, message: "Restaurant not found" };

  // Client validation (only if client_id provided)
  let client = null;
  if (client_id) {
    client = await Client.findByPk(client_id, {
      attributes: ['id'],
      raw: true
    });
    if (!client) throw { status: 404, message: "Client not found" };
  }

  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  const additionMap = new Map(additions.map(a => [a.id, a]));

  // Calculate subtotal and prepare order items
  let subtotal = 0;
  const additionsForItems = [];
  const orderItemsData = items.map((item, idx) => {
    const menuItem = menuMap.get(item.menu_item_id);
    const fallbackName = item.menu_item_name || item.menuItemName || "Article POS";
    const fallbackPrice = item.unit_price ?? item.prix_unitaire ?? item.prix ?? 0;
    
    const quantity = item.quantity || item.quantite;
    const specialInstructions = item.special_instructions || item.instructions_speciales;
    
    if (!menuItem && !item.menu_item_id) {
      throw { status: 400, message: "menu_item_id is required for each item" };
    }

    if (!menuItem && fallbackPrice === 0) {
      throw { status: 404, message: `Menu item not found: ${item.menu_item_id}` };
    }

    if (menuItem && !menuItem.is_available) {
      throw { status: 400, message: `${menuItem.nom} is not available` };
    }
    if (!quantity || quantity < 1) {
      throw { status: 400, message: "Quantity must be at least 1" };
    }

    let additionsTotal = 0;
    const additionRows = [];
    (item.additions || []).forEach(add => {
      const addition = additionMap.get(add.addition_id);
      if (!addition) {
        throw { status: 404, message: "Addition not found" };
      }
      if (!addition.is_available) {
        throw { status: 400, message: `${addition.nom} is not available` };
      }
      if (addition.menu_item_id && item.menu_item_id && addition.menu_item_id !== item.menu_item_id) {
        throw { status: 400, message: `${addition.nom} does not belong to this menu item` };
      }
      const addQty = add.quantity || add.quantite || 1;
      if (addQty < 1) {
        throw { status: 400, message: "Addition quantity must be at least 1" };
      }
      const totalAdditionQty = addQty * quantity;
      const additionTotal = parseFloat(addition.prix) * totalAdditionQty;
      additionsTotal += additionTotal;
      additionRows.push({
        addition_id: addition.id,
        quantite: totalAdditionQty,
        prix_unitaire: addition.prix
      });
    });
    additionsForItems[idx] = additionRows;

    const unitPrice = menuItem ? parseFloat(menuItem.prix) : parseFloat(fallbackPrice);
    const baseTotal = unitPrice * quantity;
    subtotal += baseTotal + additionsTotal;

    return {
      order_id: null,
      menu_item_id: item.menu_item_id,
      menu_item_name: menuItem ? menuItem.nom : fallbackName,
      quantite: quantity,
      prix_unitaire: unitPrice,
      prix_total: baseTotal,
      additions_total: additionsTotal,
      instructions_speciales: specialInstructions || null
    };
  });

// Calculate delivery time estimate
  const prepTime = 15;
  let calculatedEstimatedTime = estimated_delivery_time;
  let deliveryDurationMinutes = null;
  let distanceKm = null;

  if (order_type === 'delivery' && lat && lng) {
    const restaurantCoords = restaurant.location?.coordinates || [];
    
    if (restaurantCoords.length === 2) {
      const [restaurantLng, restaurantLat] = restaurantCoords;

      try {
        const route = await calculateRouteTime(
          restaurantLng, 
          restaurantLat, 
          parseFloat(lng), 
          parseFloat(lat), 
          40
        );
        distanceKm = route.distanceKm; 
        const totalMinutes = prepTime + route.timeMax;
        deliveryDurationMinutes = totalMinutes;
        calculatedEstimatedTime = new Date(Date.now() + totalMinutes * 60 * 1000);
      } catch (error) {
        console.warn('Route calculation failed, using default estimate:', error.message);
        deliveryDurationMinutes = 45;
        calculatedEstimatedTime = new Date(Date.now() + 45 * 60 * 1000);
      }
    }
  } else {
    // For pickup orders, just use prep time
    calculatedEstimatedTime = new Date(Date.now() + prepTime * 60 * 1000);
  }

  // Start transaction
  const transaction = await sequelize.transaction();

  try {
    // Create order (client_id can be null for pickup)
    const order = await Order.create({
      client_id: client_id || null, // NULL for POS pickup orders
      restaurant_id,
      order_type,
      delivery_address: order_type === 'delivery' ? delivery_address : null,
      delivery_fee: order_type === 'delivery' ? delivery_fee : 0,
      delivery_distance: order_type === 'delivery' ? distanceKm : null, 
      subtotal,
      payment_method,
      delivery_instructions,
      estimated_delivery_time: calculatedEstimatedTime
    }, { transaction });

    // Set coordinates for delivery orders
    if (order_type === 'delivery' && lat && lng) {
      order.setDeliveryCoordinates(parseFloat(lng), parseFloat(lat));
    }

    order.calculateTotal();
    await order.save({ transaction });

    // Create order items
    orderItemsData.forEach(item => item.order_id = order.id);
    
    const createdOrderItems = await OrderItem.bulkCreate(orderItemsData, { 
      transaction,
      validate: true,
      individualHooks: true,
      returning: true
    });

    // Create additions linked to order items
    const additionRows = [];
    createdOrderItems.forEach((orderItem, idx) => {
      const rows = additionsForItems[idx] || [];
      rows.forEach(addRow => {
        additionRows.push({
          ...addRow,
          order_item_id: orderItem.id
        });
      });
    });

    if (additionRows.length) {
      await OrderItemAddition.bulkCreate(additionRows, {
        transaction,
        validate: true,
        individualHooks: true
      });
    }

    // Fetch complete order with relations
    const completeOrder = await Order.findByPk(order.id, {
      include: [
        { 
          model: Restaurant, 
          as: 'restaurant'
        },
        { 
          model: Client, 
          as: 'client',
          required: false // Client is optional now
        },
        { 
          model: OrderItem, 
          as: 'order_items',
          include: [
            { 
              model: MenuItem, 
              as: 'menu_item'
            },
            {
              model: OrderItemAddition,
              as: 'additions',
              include: [
                {
                  model: Addition,
                  as: 'addition'
                }
              ]
            }
          ]
        }
      ],
      transaction
    });

    // Commit transaction
    await transaction.commit();

    // Notifications (async, non-blocking)
    setImmediate(() => {
      try {
        // Only schedule admin notification for delivery orders with clients
        if (order_type === 'delivery' && client_id) {
          scheduleAdminNotification(order.id);
        }
        
        // Notify restaurant
        notify('restaurant', data.restaurant_id, {
          type: 'new_order',
          orderId: order.id,
          orderNumber: order.order_number,
          orderType: order_type,
          total: order.total_amount,
          source: client_id ? 'customer' : 'pos' // Indicate POS orders
        });

        // Notify client (only if exists)
        if (client_id) {
          notify('client', client_id, {
            type: 'order_created',
            orderId: order.id,
            orderNumber: order.order_number,
            status: 'pending'
          });
        }
        
        console.log("✅ Notifications sent for order:", order.order_number);
      } catch (notifyError) {
        console.error("⚠️ Post-commit notification failed:", notifyError.message);
      }
    });

    return {
      ...completeOrder.toJSON(),
      delivery_duration_minutes: deliveryDurationMinutes,
      delivery_distance_km: distanceKm,
      source: client_id ? 'customer' : 'pos' // Indicate source
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * GET ORDERS BY RESTAURANT ID
 * Retrieves all orders for a specific restaurant
 */
export async function getOrdersByRestaurant(restaurantId, filters = {}) {
  try {
    const where = { restaurant_id: restaurantId };
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.order_type) {
      where.order_type = filters.order_type;
    }

    const orders = await Order.findAll({
      where,
      include: [
        { 
          model: Client, 
          as: 'client',
          required: false, // Client is optional
          attributes: ['id', 'first_name', 'last_name', 'phone_number', 'email']
        },
        { 
          model: OrderItem, 
          as: 'order_items',
          include: [
            { 
              model: MenuItem, 
              as: 'menu_item',
              attributes: ['id', 'nom', 'description', 'prix', 'photo_url']
            },
            {
              model: OrderItemAddition,
              as: 'additions',
              include: [
                {
                  model: Addition,
                  as: 'addition',
                  attributes: ['id', 'nom', 'prix']
                }
              ]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return orders;

  } catch (error) {
    throw error;
  }
}
