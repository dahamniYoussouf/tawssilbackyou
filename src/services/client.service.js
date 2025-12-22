import Client from "../models/Client.js";
import { Op } from "sequelize";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import Driver from "../models/Driver.js";
import OrderItem from "../models/OrderItem.js";
import OrderItemAddition from "../models/OrderItemAddition.js";
import FavoriteAddress from "../models/FavoriteAddress.js";
import Addition from "../models/Addition.js";
import MenuItem from "../models/MenuItem.js";
import { hydrateOrderItemsWithActivePromotions } from "./orders/orderEnrichment.helper.js";


export const getClientProfileByUserId = async (user_id) => {
  // Find client by user_id
  const client = await Client.findOne({
    where: { user_id },
    attributes: [
      'id',
      'user_id',
      'first_name',
      'last_name',
      'email',
      'phone_number',
      'address',
      'location',
      'profile_image_url',
      'loyalty_points',
      'is_verified',
      'is_active',
      'status',
      'created_at',
      'updated_at'
    ]
  });

  if (!client) {
    throw { status: 404, message: "Client profile not found" };
  }

  // Get favorite addresses
  const favoriteAddresses = await FavoriteAddress.findAll({
    where: { client_id: client.id },
    order: [
      ['is_default', 'DESC'],
      ['createdAt', 'DESC']
    ],
    attributes: [
      'id',
      'client_id',
      'name',
      'address',
      'lat',
      'lng',
      'location',
      'is_default',
      'createdAt',
      'updatedAt'
    ]
  });

  // Format client data
  const clientJson = client.toJSON();
  const coords = clientJson.location?.coordinates || [];

  // Format favorite addresses
  const formattedAddresses = favoriteAddresses.map(addr => {
    const addrJson = addr.toJSON();
    const addrCoords = addrJson.location?.coordinates || [];
    
    return {
      id: addrJson.id,
      name: addrJson.name,
      address: addrJson.address,
      lat: addrJson.lat || (addrCoords[1] || null),
      lng: addrJson.lng || (addrCoords[0] || null),
      is_default: addrJson.is_default,
      created_at: addrJson.createdAt,
      updated_at: addrJson.updatedAt
    };
  });

  return {
    id: clientJson.id,
    user_id: clientJson.user_id,
    first_name: clientJson.first_name,
    last_name: clientJson.last_name,
    full_name: client.getFullName(),
    email: clientJson.email,
    phone_number: clientJson.phone_number,
    address: clientJson.address,
    location: coords.length === 2 ? {
      type: 'Point',
      coordinates: coords,
      lat: coords[1],
      lng: coords[0]
    } : null,
    profile_image_url: clientJson.profile_image_url,
    loyalty_points: clientJson.loyalty_points || 0,
    is_verified: clientJson.is_verified,
    is_active: clientJson.is_active,
    status: clientJson.status,
    created_at: clientJson.created_at,
    updated_at: clientJson.updated_at,
    favorite_addresses: formattedAddresses,
    favorite_addresses_count: formattedAddresses.length
  };
};
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


export const getClientOrdersWithFilters = async (filters) => {
  const {
    client_id,
    status,
    date_range,
    date_from,
    date_to,
    min_price,
    max_price,
    search,
    page = 1,
    limit = 20
  } = filters;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where = { client_id };

  // ==================== STATUS FILTER ====================
  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    // Validate status values
    const validStatuses = ['pending', 'accepted', 'preparing', 'assigned', 'arrived', 'delivering', 'delivered', 'declined'];
    const filteredStatuses = statusArray.filter(s => validStatuses.includes(s));
    
    if (filteredStatuses.length > 0) {
      where.status = { [Op.in]: filteredStatuses };
    }
  }

  // ==================== DATE RANGE FILTER ====================
  const now = new Date();
  let startDate, endDate;

  if (date_range) {
    switch (date_range) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      
      case 'week':
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        startDate = new Date(firstDayOfWeek.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
    }
  }

  // Custom date range
  if (date_from) {
    startDate = new Date(date_from);
    startDate.setHours(0, 0, 0, 0);
  }

  if (date_to) {
    endDate = new Date(date_to);
    endDate.setHours(23, 59, 59, 999);
  }

  // Apply date filter
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at[Op.gte] = startDate;
    if (endDate) where.created_at[Op.lte] = endDate;
  }

  // ==================== PRICE RANGE FILTER ====================
  if (min_price || max_price) {
    where.total_amount = {};
    if (min_price) where.total_amount[Op.gte] = parseFloat(min_price);
    if (max_price) where.total_amount[Op.lte] = parseFloat(max_price);
  }

  // ==================== SEARCH FILTER ====================
  if (search && search.trim()) {
    where[Op.or] = [
      { order_number: { [Op.iLike]: `%${search.trim()}%` } },
      { delivery_address: { [Op.iLike]: `%${search.trim()}%` } }
    ];
  }

  // ==================== QUERY WITH INCLUDES ====================
  const { count, rows } = await Order.findAndCountAll({
    where,
    distinct: true,
    include: [
      {
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'address', 'image_url', 'rating']
      },
      {
        model: Driver,
        as: 'driver',
        attributes: ['id', 'first_name', 'last_name', 'phone', 'vehicle_type'],
        required: false
      },
      {
        model: OrderItem,
        as: 'order_items',
        include: [
          {
            model: MenuItem,
            as: 'menu_item',
            attributes: ['id', 'nom', 'photo_url', 'prix']
          },
          {
            model: OrderItemAddition,
            as: 'additions',
            required: false,
            include: [
              {
                model: Addition,
                as: 'addition',
                required: false
              }
            ]
          }
        ]
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset
  });

  await hydrateOrderItemsWithActivePromotions(rows);

  // ==================== CALCULATE SUMMARY ====================
  const allOrders = await Order.findAll({
    where: { client_id },
    attributes: ['status', 'total_amount']
  });

  const summary = {
    total_orders: allOrders.length,
    total_spent: allOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
    pending_orders: allOrders.filter(o => o.status === 'pending').length,
    delivered_orders: allOrders.filter(o => o.status === 'delivered').length,
    cancelled_orders: allOrders.filter(o => o.status === 'declined').length
  };

  // ==================== FORMAT RESPONSE ====================
  const formattedOrders = rows.map(order => ({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    order_type: order.order_type,
    restaurant: {
      id: order.restaurant.id,
      name: order.restaurant.name,
      image_url: order.restaurant.image_url
    },
    driver: order.driver ? {
      name: `${order.driver.first_name} ${order.driver.last_name}`,
      phone: order.driver.phone,
      vehicle_type: order.driver.vehicle_type
    } : null,
    items_count: order.order_items.length,
    items_preview: order.order_items.slice(0, 3).map(item => ({
      name: item.menu_item.nom,
      quantity: item.quantite,
      photo_url: item.menu_item.photo_url
    })),
    order_items: order.order_items.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      menu_item_id: item.menu_item_id,
      quantite: item.quantite,
      prix_unitaire: parseFloat(item.prix_unitaire),
      prix_total: parseFloat(item.prix_total),
      instructions_speciales: item.instructions_speciales,
      additions: (item.additions || []).map((add) => ({
        id: add.id,
        order_item_id: add.order_item_id,
        addition_id: add.addition_id,
        quantite: add.quantite,
        prix_unitaire: parseFloat(add.prix_unitaire),
        prix_total: parseFloat(add.prix_total),
        addition: add.addition
          ? {
              id: add.addition.id,
              nom: add.addition.nom,
              prix: parseFloat(add.addition.prix)
            }
          : null
      })),
      menu_item: item.menu_item
        ? {
            id: item.menu_item.id,
            nom: item.menu_item.nom,
            photo_url: item.menu_item.photo_url,
            prix: parseFloat(item.menu_item.prix),
            primary_promotions: item.menu_item.primary_promotions || [],
            promotions: item.menu_item.promotions || []
          }
        : null
    })),
    subtotal: parseFloat(order.subtotal || 0),
    delivery_fee: parseFloat(order.delivery_fee || 0),
    total_amount: parseFloat(order.total_amount || 0),
    delivery_address: order.delivery_address,
    payment_method: order.payment_method,
    rating: order.rating ? parseFloat(order.rating) : null,
    created_at: order.created_at,
    estimated_delivery_time: order.estimated_delivery_time,
    delivered_at: order.delivered_at
  }));

  return {
    orders: formattedOrders,
    pagination: {
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(count / parseInt(limit, 10)),
      total_items: count,
      items_per_page: parseInt(limit, 10)
    },
    summary
  };
};
