import Client from "../models/Client.js";
import { Op } from "sequelize";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";


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
        include: [{
          model: MenuItem,
          as: 'menu_item',
          attributes: ['id', 'nom', 'photo_url', 'prix']
        }]
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset
  });

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