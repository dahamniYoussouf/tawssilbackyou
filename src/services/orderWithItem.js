import { sequelize } from "../config/database.js";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import calculateRouteTime from "../services/routingService.js";
import { emit } from "../config/socket.js";
import {scheduleAdminNotification} from "../services/order.service.js"


// Helper to notify
function notify(type, id, data) {
  emit(`${type}:${id}`, "notification", data);
}
/**
 * CREATE ORDER WITH ITEMS IN A SINGLE TRANSACTION
 * Auto-calculates estimated_delivery_time based on restaurant and delivery location
 */
export async function createOrderWithItems(data) {
  const {
    client_id,
    restaurant_id,
    order_type = 'delivery',
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

  // OPTIMIZATION 1: Start transaction later (after validations)
  // No need to hold a DB transaction during validation logic

  // Validate basic requirements first (no DB needed)
  if (order_type === 'delivery' && !delivery_address) {
    throw { status: 400, message: "Delivery address is required for delivery orders" };
  }

  const menuItemIds = items.map(i => i.menu_item_id);

  // OPTIMIZATION 2: Use lean queries - only select needed fields
  const [restaurant, client, menuItems] = await Promise.all([
    Restaurant.findByPk(restaurant_id, {
      attributes: ['id', 'location'], // Only fetch what we need
      raw: true // Skip model instantiation if possible
    }),
    Client.findByPk(client_id, {
      attributes: ['id'],
      raw: true
    }),
    MenuItem.findAll({
      where: { id: menuItemIds },
      attributes: ['id', 'nom', 'prix', 'is_available'] // Only needed fields
    })
  ]);

  if (!restaurant) throw { status: 404, message: "Restaurant not found" };
  if (!client) throw { status: 404, message: "Client not found" };

  // Validate menu items
  if (menuItems.length !== menuItemIds.length) {
    throw { status: 404, message: "One or more menu items not found" };
  }

  const menuMap = new Map(menuItems.map(m => [m.id, m]));

  // OPTIMIZATION 3: Calculate everything BEFORE starting transaction
  let subtotal = 0;
  const orderItemsData = items.map(item => {
    const menuItem = menuMap.get(item.menu_item_id);
    
    const quantity = item.quantity || item.quantite;
    const specialInstructions = item.special_instructions || item.instructions_speciales;
    
    if (!menuItem.is_available) {
      throw { status: 400, message: `${menuItem.nom} is not available` };
    }
    if (!quantity || quantity < 1) {
      throw { status: 400, message: "Quantity must be at least 1" };
    }

    const itemTotal = parseFloat(menuItem.prix) * quantity;
    subtotal += itemTotal;

    return {
      order_id: null,
      menu_item_id: item.menu_item_id,
      quantite: quantity,
      prix_unitaire: menuItem.prix,
      prix_total: itemTotal,
      instructions_speciales: specialInstructions || null
    };
  });

  // OPTIMIZATION 4: Calculate delivery time BEFORE transaction
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
    calculatedEstimatedTime = new Date(Date.now() + prepTime * 60 * 1000);
  }

  // OPTIMIZATION 5: NOW start transaction - only for actual DB writes
  const transaction = await sequelize.transaction();

  try {
    // Create order with pre-calculated values
    const order = await Order.create({
      client_id,
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

    // Set coordinates and calculate total
    if (order_type === 'delivery' && lat && lng) {
      order.setDeliveryCoordinates(parseFloat(lng), parseFloat(lat));
    }

    order.calculateTotal();
    await order.save({ transaction });

    // Create order items
    orderItemsData.forEach(item => item.order_id = order.id);
    
    await OrderItem.bulkCreate(orderItemsData, { 
      transaction,
      validate: true,
      individualHooks: true
    });

    // OPTIMIZATION 6: Fetch complete order with all fields
    const completeOrder = await Order.findByPk(order.id, {
      include: [
        { 
          model: Restaurant, 
          as: 'restaurant'
          // All fields included by default
        },
        { 
          model: Client, 
          as: 'client'
          // All fields included by default
        },
        { 
          model: OrderItem, 
          as: 'order_items',
          include: [{ 
            model: MenuItem, 
            as: 'menu_item'
            // All fields included by default
          }]
        }
      ],
      transaction
    });

    // OPTIMIZATION 7: Commit BEFORE notifications (non-critical operations)
    await transaction.commit();

    // OPTIMIZATION 8: Run notifications asynchronously without blocking response
    setImmediate(() => {
      try {
        scheduleAdminNotification(order.id);
        notify('restaurant', data.restaurant_id, {
          type: 'new_order',
          orderId: order.id,
          orderNumber: order.order_number,
          total: order.total
        });
        console.log("emitting notification to admin");
      } catch (notifyError) {
        console.error("Post-commit notification failed:", notifyError.message);
      }
    });

    // Return immediately
    return {
      ...completeOrder.toJSON(),
      delivery_duration_minutes: deliveryDurationMinutes,
      delivery_distance_km: distanceKm
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
    
    // Add optional filters
    if (filters.status) {
      where.statut = filters.status;
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