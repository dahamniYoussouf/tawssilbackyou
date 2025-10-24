import { sequelize } from "../config/database.js";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import calculateRouteTime from "../services/routingService.js";
import { emit } from "../config/socket.js";


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

  const transaction = await sequelize.transaction();

  try {
    // Verify restaurant and client exist
    const [restaurant, client] = await Promise.all([
      Restaurant.findByPk(restaurant_id, { transaction }),
      Client.findByPk(client_id, { transaction })
    ]);

    if (!restaurant) throw { status: 404, message: "Restaurant not found" };
    if (!client) throw { status: 404, message: "Client not found" };

    if (order_type === 'delivery' && !delivery_address) {
      throw { status: 400, message: "Delivery address is required for delivery orders" };
    }

    // Get all menu items
    const menuItemIds = items.map(i => i.menu_item_id);
    const menuItems = await MenuItem.findAll({
      where: { id: menuItemIds },
      transaction
    });

    if (menuItems.length !== menuItemIds.length) {
      throw { status: 404, message: "One or more menu items not found" };
    }

    const menuMap = new Map(menuItems.map(m => [m.id, m]));

    // Validate items and calculate subtotal
    let subtotal = 0;
    const orderItemsData = items.map(item => {
      const menuItem = menuMap.get(item.menu_item_id);
      
      // Support both English (quantity) and French (quantite) property names
      const quantity = item.quantity || item.quantite;
      const specialInstructions = item.special_instructions || item.instructions_speciales;
      
      if (!menuItem.is_available) {
        throw { status: 400, message: `${menuItem.nom} is not available` };
      }
      if (!quantity || quantity < 1) {
        throw { status: 400, message: "Quantity must be at least 1" };
      }

      // Calculate item total
      const itemTotal = parseFloat(menuItem.prix) * quantity;
      subtotal += itemTotal;

      return {
        order_id: null, // Will be set after order creation
        menu_item_id: item.menu_item_id,
        quantite: quantity,
        prix_unitaire: menuItem.prix,
        prix_total: itemTotal,  // Calculate manually to ensure it's set
        instructions_speciales: specialInstructions || null
      };
    });

    // Calculate estimated delivery time for delivery orders
    let calculatedEstimatedTime = estimated_delivery_time;
    let deliveryDurationMinutes = null;
    
    if (order_type === 'delivery' && lat && lng) {
      const restaurantCoords = restaurant.location?.coordinates || [];
      
      if (restaurantCoords.length === 2) {
        const [restaurantLng, restaurantLat] = restaurantCoords;
        
        try {
          // Calculate route time (assuming average speed of 40 km/h)
          const route = await calculateRouteTime(
            restaurantLng, 
            restaurantLat, 
            parseFloat(lng), 
            parseFloat(lat), 
            40
          );
          
          // Preparation time (average of menu items or default 15 minutes)
          const prepTime = 15;
          
          // Total delivery time in minutes: prep time + travel time (use max for safety)
          const totalMinutes = prepTime + route.timeMax;
          deliveryDurationMinutes = totalMinutes;
          
          // Set estimated delivery time
          calculatedEstimatedTime = new Date(Date.now() + totalMinutes * 60 * 1000);
        } catch (error) {
          console.warn('Route calculation failed, using default estimate:', error.message);
          // Fallback: use a default 45 minutes if route calculation fails
          deliveryDurationMinutes = 45;
          calculatedEstimatedTime = new Date(Date.now() + 45 * 60 * 1000);
        }
      }
    }

    // Create order
    const order = await Order.create({
      client_id,
      restaurant_id,
      order_type,
      delivery_address: order_type === 'delivery' ? delivery_address : null,
      delivery_fee: order_type === 'delivery' ? delivery_fee : 0,
      subtotal,
      payment_method,
      delivery_instructions,
      estimated_delivery_time: calculatedEstimatedTime
    }, { transaction });

    // Set coordinates if provided
    if (order_type === 'delivery' && lat && lng) {
      order.setDeliveryCoordinates(parseFloat(lng), parseFloat(lat));
    }

    order.calculateTotal();
    await order.save({ transaction });

    // Create order items - set order_id first
    orderItemsData.forEach(item => item.order_id = order.id);
    
    // bulkCreate with individualHooks to trigger beforeValidate for each item
    await OrderItem.bulkCreate(orderItemsData, { 
      transaction,
      validate: true,
      individualHooks: true  // This ensures beforeValidate runs for each record
    });

    // Fetch complete order BEFORE committing transaction
    const completeOrder = await Order.findByPk(order.id, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Client, as: 'client' },
        { 
          model: OrderItem, 
          as: 'order_items',
          include: [{ model: MenuItem, as: 'menu_item' }]
        }
      ],
      transaction
    });

    await transaction.commit();

    scheduleAdminNotification(order.id);

      notify('restaurant', data.restaurant_id, {
    type: 'new_order',
    orderId: order.id,
    orderNumber: order.order_number,
    total: order.total
  });
    // Return complete order with delivery duration
    return {
      ...completeOrder.toJSON(),
      delivery_duration_minutes: deliveryDurationMinutes
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