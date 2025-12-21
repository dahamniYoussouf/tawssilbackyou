import { sequelize } from "../config/database.js";
import { Op } from "sequelize";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import OrderItemAddition from "../models/OrderItemAddition.js";
import MenuItem from "../models/MenuItem.js";
import Addition from "../models/Addition.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";
import Promotion from "../models/Promotion.js";
import SystemConfig from "../models/SystemConfig.js";
import calculateRouteTime from "../services/routingService.js";
import { emit } from "../config/socket.js";
import { scheduleAdminNotification } from "../services/order.service.js";
import { hydrateOrderItemsWithActivePromotions } from "./orders/orderEnrichment.helper.js";

// Helper to notify
function notify(type, id, data) {
  emit(`${type}:${id}`, "notification", data);
}

const promotionIncludes = [
  {
    model: MenuItem,
    as: "menu_item",
    attributes: ["id", "nom", "prix"]
  },
  {
    model: MenuItem,
    as: "menu_items",
    through: { attributes: [] },
    attributes: ["id", "nom", "prix"]
  }
];

const fetchActivePromotions = async (restaurantId) => {
  const now = new Date();
  const orClauses = [
    { scope: "global" },
    { scope: "cart" },
    { scope: "delivery" }
  ];
  if (restaurantId) {
    orClauses.push({ restaurant_id: restaurantId });
  }

  return Promotion.findAll({
    where: {
      is_active: true,
      [Op.and]: [
        {
          [Op.or]: [
            { start_date: null },
            { start_date: { [Op.lte]: now } }
          ]
        },
        {
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: now } }
          ]
        }
      ],
      [Op.or]: orClauses
    },
    include: promotionIncludes
  });
};

const serializePromotion = (promotion) => {
  if (!promotion) return null;
  const payload = typeof promotion.toJSON === "function" ? promotion.toJSON() : promotion;
  return {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    badge_text: payload.badge_text,
    type: payload.type,
    scope: payload.scope,
    discount_value: payload.discount_value ? Number(payload.discount_value) : null,
    currency: payload.currency || "DZD",
    buy_quantity: payload.buy_quantity,
    free_quantity: payload.free_quantity,
    restaurant_id: payload.restaurant_id,
    menu_item_id: payload.menu_item_id,
    custom_message: payload.custom_message,
    start_date: payload.start_date,
    end_date: payload.end_date
  };
};

const matchesMenuItem = (promo, menuItemId) => {
  if (!menuItemId) return false;
  if (promo.menu_item_id === menuItemId) return true;
  if (promo.menu_item?.id === menuItemId) return true;
  if (Array.isArray(promo.menu_items)) {
    return promo.menu_items.some((menu) => menu.id === menuItemId);
  }
  return false;
};

const promotionTargetsItem = (promo, menuItemId, restaurantId) => {
  if (!promo) return false;
  if (promo.scope === "cart" || promo.scope === "delivery") return false;
  if (promo.scope === "menu_item" && matchesMenuItem(promo, menuItemId)) return true;
  if (promo.scope === "restaurant" && promo.restaurant_id === restaurantId) return true;
  if (promo.scope === "global") return true;
  if (!promo.scope && matchesMenuItem(promo, menuItemId)) return true;
  return false;
};

const computePromotionEffect = (promo, unitPrice, quantity) => {
  if (!promo || quantity <= 0) return null;
  const totalCap = unitPrice * quantity;
  const percentValue = Number(promo.discount_value || 0);

  if (promo.type === "percentage" && percentValue > 0) {
    const discountPerUnit = (unitPrice * percentValue) / 100;
    const discountTotal = Math.min(totalCap, discountPerUnit * quantity);
    if (discountTotal <= 0) return null;
    return { discountTotal, freeItems: 0 };
  }

  if (promo.type === "amount" && percentValue > 0) {
    const discountPerUnit = Math.min(unitPrice, percentValue);
    const discountTotal = Math.min(totalCap, discountPerUnit * quantity);
    if (discountTotal <= 0) return null;
    return { discountTotal, freeItems: 0 };
  }

  if (promo.type === "buy_x_get_y") {
    const buy = Number(promo.buy_quantity || 0);
    const free = Number(promo.free_quantity || 0);
    if (buy <= 0 || free <= 0) return null;
    const cycle = buy + free;
    if (cycle <= 0) return null;
    const groups = Math.floor(quantity / cycle);
    const freeItems = groups * free;
    if (freeItems <= 0) return null;
    const discountTotal = Math.min(totalCap, freeItems * unitPrice);
    return { discountTotal, freeItems };
  }

  return null;
};

const selectBestPromotionForItem = (promotions, menuItemId, restaurantId, unitPrice, quantity) => {
  if (!Array.isArray(promotions) || !menuItemId) return null;
  let best = null;
  for (const promo of promotions) {
    if (!promotionTargetsItem(promo, menuItemId, restaurantId)) continue;
    const effect = computePromotionEffect(promo, unitPrice, quantity);
    if (!effect) continue;
    if (!best || effect.discountTotal > best.discountTotal) {
      best = { ...effect, promotion: promo };
    }
  }
  return best;
};

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

/**
 * CREATE ORDER WITH ITEMS IN A SINGLE TRANSACTION
 * ✅ NOW SUPPORTS NULL client_id FOR PICKUP ORDERS (POS)
 */
export async function createOrderWithItems(data) {
  let {
    client_id, // ✅ CAN BE NULL FOR POS PICKUP ORDERS
    restaurant_id,
    order_type = 'pickup', // Default to pickup for POS
    delivery_address,
    lat,
    lng,
    delivery_fee,
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
  const [restaurant, menuItems, additions, configuredPreparationTime, configuredDefaultDeliveryFee] = await Promise.all([
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
      : Promise.resolve([]),
    SystemConfig.get('default_preparation_time', 15),
    SystemConfig.get('default_delivery_fee', 200)
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

  const parsedPreparationTime = Number.parseInt(String(configuredPreparationTime), 10);
  const defaultPreparationMinutes = Number.isFinite(parsedPreparationTime)
    ? Math.min(120, Math.max(5, parsedPreparationTime))
    : 15;

  const parsedDefaultDeliveryFee = Number.parseFloat(String(configuredDefaultDeliveryFee));
  const defaultDeliveryFee = Number.isFinite(parsedDefaultDeliveryFee)
    ? Math.min(10000, Math.max(0, parsedDefaultDeliveryFee))
    : 200;

  if (order_type === 'delivery') {
    const parsedRequestedDeliveryFee =
      delivery_fee === undefined || delivery_fee === null
        ? null
        : Number.parseFloat(String(delivery_fee));

    delivery_fee =
      parsedRequestedDeliveryFee === null ||
      !Number.isFinite(parsedRequestedDeliveryFee) ||
      parsedRequestedDeliveryFee <= 0
        ? defaultDeliveryFee
        : Math.min(10000, Math.max(defaultDeliveryFee, parsedRequestedDeliveryFee));
  } else {
    delivery_fee = 0;
  }

  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  const additionMap = new Map(additions.map(a => [a.id, a]));

  // Calculate subtotal and prepare order items
  const promotions = await fetchActivePromotions(restaurant_id);
  let subtotal = 0;
  const additionsForItems = [];
  const orderItemsData = [];
  const promotionMetadata = [];
  const appliedOrderPromotions = [];

  items.forEach((item, idx) => {
    const menuItem = menuMap.get(item.menu_item_id);
    const fallbackName = item.menu_item_name || item.menuItemName || "Article POS";
    const fallbackPrice = Number.parseFloat(item.unit_price ?? item.prix_unitaire ?? item.prix ?? 0) || 0;

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

    const unitPrice = menuItem ? parseFloat(menuItem.prix) : fallbackPrice;
    const promotionResult = menuItem
      ? selectBestPromotionForItem(promotions, menuItem.id, restaurant_id, unitPrice, quantity)
      : null;
    const discountTotal = promotionResult?.discountTotal || 0;
    const effectiveUnitPrice = promotionResult
      ? Math.max(0, (unitPrice * quantity - discountTotal) / quantity)
      : unitPrice;
    const finalUnitPrice = roundMoney(effectiveUnitPrice);
    const lineTotal = roundMoney(finalUnitPrice * quantity);

    subtotal += lineTotal + additionsTotal;

    orderItemsData.push({
      order_id: null,
      menu_item_id: item.menu_item_id,
      menu_item_name: menuItem ? menuItem.nom : fallbackName,
      quantite: quantity,
      prix_unitaire: finalUnitPrice,
      prix_total: lineTotal,
      additions_total: additionsTotal,
      instructions_speciales: specialInstructions || null
    });

    promotionMetadata.push({
      promotion: serializePromotion(promotionResult?.promotion),
      discount_total: Number((discountTotal || 0).toFixed(2)),
      free_items: promotionResult?.freeItems || 0,
      original_unit_price: unitPrice,
      final_unit_price: finalUnitPrice
    });
  });


  const orderPromotionCandidates = promotions.filter((promo) =>
    promo.scope === "cart" || promo.scope === "delivery" || promo.type === "free_delivery"
  );

  if (order_type === "delivery") {
    const deliveryPromo = orderPromotionCandidates.find((promo) =>
      promo.type === "free_delivery" || promo.scope === "delivery"
    );
    if (deliveryPromo && delivery_fee > 0) {
      const waivedFee = roundMoney(delivery_fee);
      delivery_fee = 0;
      appliedOrderPromotions.push({
        ...serializePromotion(deliveryPromo),
        effect: "delivery_fee_waived",
        applied_amount: waivedFee
      });
    }
  }

  const cartPromotions = orderPromotionCandidates.filter((promo) => promo.scope === "cart");
  for (const promo of cartPromotions) {
    let discount = 0;
    if (promo.type === "percentage") {
      const percent = Number(promo.discount_value || 0);
      if (percent > 0) {
        discount = (subtotal * percent) / 100;
      }
    } else if (promo.type === "amount") {
      discount = Number(promo.discount_value || 0);
    }

    if (!discount || discount <= 0) {
      appliedOrderPromotions.push({
        ...serializePromotion(promo),
        effect: "cart_info",
        applied_amount: 0
      });
      continue;
    }

    const allowedDiscount = Math.min(subtotal, discount);
    subtotal = Math.max(0, subtotal - allowedDiscount);
    appliedOrderPromotions.push({
      ...serializePromotion(promo),
      effect: "cart_discount",
      applied_amount: roundMoney(allowedDiscount)
    });
  }


// Calculate delivery time estimate
  const prepTime = defaultPreparationMinutes;
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

    const completeOrderJson = completeOrder.toJSON();
    const enrichedOrderItems = completeOrderJson.order_items.map((item, index) => {
      const meta = promotionMetadata[index];
      const appliedPromotion = meta?.promotion
        ? {
            ...meta.promotion,
            discount_total: Number((meta.discount_total || 0).toFixed(2)),
            free_items: meta.free_items || 0,
            original_unit_price: meta.original_unit_price,
            final_unit_price: meta.final_unit_price
          }
        : null;

      return {
        ...item,
        applied_promotion: appliedPromotion,
        original_unit_price: meta?.original_unit_price,
        is_free_item: !!appliedPromotion && (meta?.free_items || 0) > 0
      };
    });
    completeOrderJson.order_items = enrichedOrderItems;

    return {
      ...completeOrderJson,
      delivery_duration_minutes: deliveryDurationMinutes,
      delivery_distance_km: distanceKm,
      source: client_id ? 'customer' : 'pos', // Indicate source
      applied_promotions: {
        order: appliedOrderPromotions,
        items: enrichedOrderItems.map(item => item.applied_promotion).filter(Boolean)
      }
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

    await hydrateOrderItemsWithActivePromotions(orders);

    return orders;

  } catch (error) {
    throw error;
  }
}
