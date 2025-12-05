import Restaurant from "../models/Restaurant.js";
import FavoriteRestaurant from "../models/FavoriteRestaurant.js";
import FoodCategory from "../models/FoodCategory.js";
import MenuItem from "../models/MenuItem.js";
import Client from "../models/Client.js";
import Order from "../models/Order.js";
import { Op, literal } from "sequelize";
import axios from "axios";
import FavoriteMeal from "../models/FavoriteMeal.js";
import OrderItem from "../models/OrderItem.js";
import Driver from "../models/Driver.js";




/**
 * Fetch all restaurants with open/close status
 */
export const getAllRestaurants = async () => {
  const restaurants = await Restaurant.findAll({
    order: [["created_at", "DESC"]]
  });

  return restaurants.map(r => ({
    ...r.toJSON(),
    is_open: r.isOpen()
  }));
};

/**
 * Filter restaurants nearby with category, query, pagination, and favorites
 */
export const filterNearbyRestaurants = async (filters) => {
  const {
    client_id,
    address,
    lat,
    lng,
    radius = 2000,
    q,
    categories, // Changed from category (now accepts array)
    page = 1,
    pageSize = 20
  } = filters;

  let latitude, longitude;

  // Handle address-based search (geocoding)
  if (address && address.trim()) {
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: address, format: "json", limit: 1 },
        headers: { "User-Agent": "food-delivery-app" },
        timeout: 10000 // 10 secondes timeout
      });

      if (response.data.length === 0) {
        const error = new Error("Address not found");
        error.status = 404;
        throw error;
      }

      latitude = parseFloat(response.data[0].lat);
      longitude = parseFloat(response.data[0].lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        const error = new Error("Invalid coordinates returned from geocoding service");
        error.status = 502;
        throw error;
      }
    } catch (error) {
      // Si c'est déjà une erreur avec un statut, la relancer
      if (error.status) {
        throw error;
      }

      // Gérer les erreurs axios
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const timeoutError = new Error("Geocoding service timeout. Please try again or use coordinates.");
        timeoutError.status = 503;
        throw timeoutError;
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
        const serviceError = new Error("Geocoding service unavailable. Please try again later or use coordinates.");
        serviceError.status = 503;
        throw serviceError;
      }

      if (error.response?.status === 429) {
        const rateLimitError = new Error("Too many geocoding requests. Please try again later or use coordinates.");
        rateLimitError.status = 429;
        throw rateLimitError;
      }

      // Erreur générique de géocodage
      const geocodeError = new Error("Unable to geocode address. Please check the address or use coordinates.");
      geocodeError.status = 400;
      throw geocodeError;
    }
  }
  // Handle coordinate-based search
  else if (lat && lng) {
    latitude = parseFloat(lat);
    longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      const error = new Error("Invalid coordinates");
      error.status = 400;
      throw error;
    }
  }
  // Neither provided
  else {
    const error = new Error("Address or coordinates required");
    error.status = 400;
    throw error;
  }

  const searchRadius = parseInt(radius, 10);

  // Base WHERE conditions
  const whereConditions = {
    [Op.and]: [
      { is_active: true },
      { status: 'approved' },
      literal(
        `ST_DWithin(location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`
      )
    ]
  };

  // Filter by restaurant name
  if (q && q.trim()) {
    whereConditions[Op.and].push({
      name: { [Op.iLike]: `%${q.trim()}%` }
    });
  }

  // Filter by categories (using PostgreSQL array operators)
  if (categories) {
    const categoryArray = Array.isArray(categories) ? categories : [categories];
    whereConditions[Op.and].push({
      categories: {
        [Op.overlap]: categoryArray // Matches restaurants that have ANY of the specified categories
      }
    });
  }

  const limit = parseInt(pageSize, 10);
  const offset = (parseInt(page, 10) - 1) * limit;

  // Main query (removed include for RestaurantCategory)
  const result = await Restaurant.findAll({
    attributes: {
      include: [
        [
          literal(`ST_Distance(location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`),
          "distance"
        ]
      ]
    },
    where: whereConditions,
    order: [
      ["is_premium", "DESC"],
      [literal("distance"), "ASC"]
    ],
    limit,
    offset
  });

  // Get client's favorite restaurants
  const favoriteMap = new Map();
  if (client_id) {
    const favorites = await FavoriteRestaurant.findAll({
      where: { client_id },
      attributes: ["restaurant_id", "id"],
      raw: true
    });
    favorites.forEach(fav => favoriteMap.set(fav.restaurant_id, fav.id));
  }

  // Format response
  // Utiliser la distance fournie par la BDD (en mètres) pour calculer le temps de livraison
  const formatted = result.map((r) => {
    const coords = r.location?.coordinates || [];
    const favoriteUuid = favoriteMap.get(r.id) || null;

    const prepTime = 15;
    
    // Distance en mètres depuis la BDD (ST_Distance retourne des mètres)
    const distanceMeters = r.dataValues.distance || 0;
    const distanceKm = distanceMeters / 1000;
    
    // Calculer le temps de livraison basé sur la distance (vitesse moyenne: 40 km/h)
    const speedKmh = 40;
    const deliveryTimeMinutes = (distanceKm / speedKmh) * 60;
    
    // Temps optimiste et pessimiste (comme calculateRouteTime)
    const deliveryTimeMin = Math.floor(deliveryTimeMinutes * 0.9); // -10%
    const deliveryTimeMax = Math.ceil(deliveryTimeMinutes * 1.2);  // +20%

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      address: r.address,
      lat: coords[1] || null,
      lng: coords[0] || null,
      rating: r.rating,
      delivery_time_min: prepTime + deliveryTimeMin,
      delivery_time_max: prepTime + deliveryTimeMax,
      image_url: r.image_url,
      distance: distanceMeters, // Distance en mètres
      is_premium: r.is_premium,
      status: r.status,
      is_open: r.isOpen(),
      categories: r.categories, // Changed from category object
      favorite_uuid: favoriteUuid,
      email: r.email || null
    };
  })

  return {
    formatted,
    count: formatted.length,
    page: parseInt(page, 10),
    pageSize: limit,
    radius: searchRadius,
    center: { lat: latitude, lng: longitude },
    searchType: address ? "address" : "coordinates",
    client_id: client_id || null
  };
};


export const filter = async (filters = {}) => {
  const {
    q,
    categories,
    status,
    address,
    is_active,
    is_premium,
    is_open,
    page = 1,
    pageSize = 20,
    sort = "default"
  } = filters;

  const limit = Math.max(1, parseInt(pageSize, 10));
  const pageNum = Math.max(1, parseInt(page, 10));
  const offset = (pageNum - 1) * limit;

  // Base WHERE conditions
  const whereConditions = { [Op.and]: [] };

  // Filter by restaurant name
  if (q && q.trim()) {
    whereConditions[Op.and].push({
      name: { [Op.iLike]: `%${q.trim()}%` }
    });
  }

  // Filter by categories
  if (categories) {
    const categoryArray = Array.isArray(categories) ? categories : [categories];
    whereConditions[Op.and].push({
      categories: {
        [Op.overlap]: categoryArray
      }
    });
  }

  // Filter by status
  if (status && status.trim()) {
    const validStatuses = ['pending', 'approved', 'suspended', 'archived'];
    if (validStatuses.includes(status.trim())) {
      whereConditions[Op.and].push({
        status: status.trim()
      });
    }
  }

  // Filter by address
  if (address && address.trim()) {
    whereConditions[Op.and].push({
      address: { [Op.iLike]: `%${address.trim()}%` }
    });
  }

  // Filter by is_active
  if (is_active !== undefined && is_active !== null && is_active !== '') {
    const isActiveValue = is_active === 'true' || is_active === true;
    whereConditions[Op.and].push({
      is_active: isActiveValue
    });
  }

  // Filter by is_premium
  if (is_premium !== undefined && is_premium !== null && is_premium !== '') {
    const isPremiumValue = is_premium === 'true' || is_premium === true;
    whereConditions[Op.and].push({
      is_premium: isPremiumValue
    });
  }

  // Sorting
  let order;
  switch (sort) {
    case "rating":
      order = [["rating", "DESC"], ["is_premium", "DESC"], ["name", "ASC"]];
      break;
    case "name":
      order = [["name", "ASC"]];
      break;
    default:
      order = [["is_premium", "DESC"], ["rating", "DESC"], ["name", "ASC"]];
  }

  // Build WHERE clause
  const whereClause = whereConditions[Op.and].length > 0 
    ? whereConditions 
    : {};

  // Main query
  const { rows, count } = await Restaurant.findAndCountAll({
    where: whereClause,
    order,
    limit,
    offset
  });

  // ✅ IMPORTANT: Sauvegarder le count AVANT filtrage is_open
  const totalCount = count;

  // Format response
  let formatted = rows.map((r) => {
    const coords = r.location?.coordinates || [];

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      address: r.address,
      lat: coords[1] ?? null,
      lng: coords[0] ?? null,
      rating: r.rating,
      delivery_time_min: null,
      delivery_time_max: null,
      image_url: r.image_url,
      phone_number:r.phone_number,
      email: r.email || null,
      distance: null,
      is_premium: r.is_premium,
      is_active: r.is_active,
      status: r.status,
      is_open: r.isOpen(),
      categories: r.categories,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  });

  // Filter by is_open (post-query filter)
  if (is_open !== undefined && is_open !== null && is_open !== '') {
    const isOpenValue = is_open === 'true' || is_open === true;
    formatted = formatted.filter(r => r.is_open === isOpenValue);
  }

  // ✅ CORRECTION: Utiliser totalCount (AVANT is_open filter) pour totalPages
  return {
    formatted,
    count: totalCount,  // ✅ Count total (pour l'affichage)
    page: pageNum,
    pageSize: limit,
    totalPages: Math.ceil(totalCount / limit) || 1, // ✅ Basé sur le count total
    searchType: "no-location"
  };
};

/**
 * Get nearby restaurant names only
 */
export const getNearbyRestaurantNames = async (filters) => {
  const { address, lat, lng, radius = 2000 } = filters;

  let latitude, longitude;

  // Geocode if address provided
  if (address && address.trim()) {
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: address, format: "json", limit: 1 },
        headers: { "User-Agent": "food-delivery-app" },
        timeout: 10000 // 10 secondes timeout
      });

      if (response.data.length === 0) {
        const error = new Error("Address not found");
        error.status = 404;
        throw error;
      }

      latitude = parseFloat(response.data[0].lat);
      longitude = parseFloat(response.data[0].lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        const error = new Error("Invalid coordinates returned from geocoding service");
        error.status = 502;
        throw error;
      }
    } catch (error) {
      // Si c'est déjà une erreur avec un statut, la relancer
      if (error.status) {
        throw error;
      }

      // Gérer les erreurs axios
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const timeoutError = new Error("Geocoding service timeout. Please try again or use coordinates.");
        timeoutError.status = 503;
        throw timeoutError;
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
        const serviceError = new Error("Geocoding service unavailable. Please try again later or use coordinates.");
        serviceError.status = 503;
        throw serviceError;
      }

      if (error.response?.status === 429) {
        const rateLimitError = new Error("Too many geocoding requests. Please try again later or use coordinates.");
        rateLimitError.status = 429;
        throw rateLimitError;
      }

      // Erreur générique de géocodage
      const geocodeError = new Error("Unable to geocode address. Please check the address or use coordinates.");
      geocodeError.status = 400;
      throw geocodeError;
    }
  }
  // Use coordinates
  else if (lat && lng) {
    latitude = parseFloat(lat);
    longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      const error = new Error("Invalid coordinates");
      error.status = 400;
      throw error;
    }
  }
  // Neither provided
  else {
    const error = new Error("Address or coordinates required");
    error.status = 400;
    throw error;
  }

  const searchRadius = parseInt(radius, 10);

  const restaurants = await Restaurant.findAll({
    attributes: [
      "name",
      [
        literal(`ST_Distance(location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`),
        "distance"
      ]
    ],
    where: {
      [Op.and]: [
        { is_active: true },
        literal(
          `ST_DWithin(location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`
        )
      ]
    },
    order: [
      ["is_premium", "DESC"],
      [literal("distance"), "ASC"]
    ],
    limit: 50
  });

  const names = restaurants.map(r => r.name);

  return {
    names,
    count: names.length,
    radius: searchRadius,
    center: { lat: latitude, lng: longitude },
    searchType: address ? "address" : "coordinates"
  };
};

/**
 * Update a restaurant
 */
export const updateRestaurant = async (id, data) => {
  const resto = await Restaurant.findOne({ where: { id } });

  if (!resto) {
    throw new Error("Restaurant not found");
  }

  const {
    name,
    description,
    address,
    lat,
    lng,
    rating,
    image_url,
    is_active,
    is_premium,
    status,
    opening_hours,
    categories, // Added
    email
  } = data;

  // Validate categories if provided
  if (categories !== undefined) {
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new Error("At least one category is required");
    }
  }

  await resto.update({
    name,
    description,
    address,
    location: lat && lng ? { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] } : resto.location,
    rating,
    image_url,
    is_active,
    is_premium,
    status,
    opening_hours,
    ...(categories && { categories }), // Only update if provided
    ...(email !== undefined && { email }) // Only update if provided
  });

  return resto;
};

/**
 * Delete a restaurant
 */
export const deleteRestaurant = async (id) => {
  const deleted = await Restaurant.destroy({ where: { id } });

  if (!deleted) {
    throw new Error("Restaurant not found");
  }

  return deleted;
};

export const getCategoriesWithMenuItems = async (restaurantId, clientId = null) => {
  // Verify restaurant exists
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  // Fetch all categories with their menu items
  const categories = await FoodCategory.findAll({
    where: { restaurant_id: restaurantId },
    include: [{
      model: MenuItem,
      as: 'items', // association alias
      where: { is_available: true },
      required: false,
      attributes: [
        'id',
        'nom',
        'description',
        'prix',
        'photo_url',
        'temps_preparation',
        'is_available'
      ]
    }],
    order: [
      ['ordre_affichage', 'ASC'],
      ['created_at', 'DESC'],
      [{ model: MenuItem, as: 'items' }, 'nom', 'ASC']
    ]
  });

  // If client_id is provided, get their favorites
  let favoritesMap = new Map();
  if (clientId) {
    const allMenuItemIds = categories.flatMap(cat =>
      cat.items ? cat.items.map(item => item.id) : []
    );

    if (allMenuItemIds.length > 0) {
      const favorites = await FavoriteMeal.findAll({
        where: {
          client_id: clientId,
          meal_id: { [Op.in]: allMenuItemIds }
        },
        attributes: ["meal_id", "id"]
      });

      favorites.forEach(fav => favoritesMap.set(fav.meal_id, fav.id));
    }
  }

  // Format response
  const formattedCategories = categories.map(category => ({
    id: category.id,
    nom: category.nom,
    description: category.description,
    icone_url: category.icone_url,
    ordre_affichage: category.ordre_affichage,
    items: category.items
      ? category.items.map(item => ({
          id: item.id,
          nom: item.nom,
          description: item.description,
          prix: parseFloat(item.prix),
          photo_url: item.photo_url,
          temps_preparation: item.temps_preparation,
          is_available: item.is_available,
          is_favorite: favoritesMap.has(item.id),
          favorite_id: favoritesMap.get(item.id) || null
        }))
      : [],
    items_count: category.items ? category.items.length : 0
  }));

  return {
    restaurant_id: restaurantId,
    restaurant_name: restaurant.name,
    categories: formattedCategories,
    total_categories: formattedCategories.length,
    total_items: formattedCategories.reduce((sum, cat) => sum + cat.items_count, 0)
  };
};

/**
 * Get restaurant statistics
 */
export const getRestaurantStatistics = async (restaurantId, filters = {}) => {
  const { date_from, date_to } = filters;

  // Verify restaurant exists
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  // Build date filter
  const dateWhere = {};
  if (date_from) dateWhere[Op.gte] = new Date(date_from);
  if (date_to) dateWhere[Op.lte] = new Date(date_to);

  const orderWhere = {
    restaurant_id: restaurantId,
    ...(Object.keys(dateWhere).length > 0 && { created_at: dateWhere })
  };

  // Get all orders for this restaurant
  const orders = await Order.findAll({
    where: orderWhere,
    attributes: [
      'id',
      'status',
      'order_type',
      'total_amount',
      'rating',
      'created_at'
    ]
  });

  // Calculate statistics
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const preparingOrders = orders.filter(o => o.status === 'preparing').length;
  const deliveringOrders = orders.filter(o => o.status === 'delivering').length;
  const declinedOrders = orders.filter(o => o.status === 'declined').length;

  // Calculate revenue (only completed orders)
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  // Calculate average order value
  const averageOrderValue = completedOrders > 0 
    ? (totalRevenue / completedOrders).toFixed(2) 
    : 0;

  // Calculate ratings
  const ratedOrders = orders.filter(o => o.rating !== null && o.rating !== undefined);
  const averageRating = ratedOrders.length > 0
    ? (ratedOrders.reduce((sum, o) => sum + parseFloat(o.rating), 0) / ratedOrders.length).toFixed(1)
    : null;

  // Order type breakdown
  const deliveryOrders = orders.filter(o => o.order_type === 'delivery').length;
  const pickupOrders = orders.filter(o => o.order_type === 'pickup').length;

  // Get recent orders (last 10)
  const recentOrders = await Order.findAll({
    where: { restaurant_id: restaurantId },
    include: [
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'first_name', 'last_name']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: 10,
    attributes: ['id', 'order_number', 'status', 'total_amount', 'created_at']
  });

  // Calculate completion rate
  const completionRate = totalOrders > 0 
    ? ((completedOrders / totalOrders) * 100).toFixed(1) 
    : 0;

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      rating: restaurant.rating,
      is_active: restaurant.is_active,
      is_premium: restaurant.is_premium
    },
    statistics: {
      total_orders: totalOrders,
      completed_orders: completedOrders,
      pending_orders: pendingOrders,
      preparing_orders: preparingOrders,
      delivering_orders: deliveringOrders,
      declined_orders: declinedOrders,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      average_order_value: parseFloat(averageOrderValue),
      average_rating: averageRating ? parseFloat(averageRating) : null,
      rated_orders_count: ratedOrders.length,
      delivery_orders: deliveryOrders,
      pickup_orders: pickupOrders,
      completion_rate: parseFloat(completionRate)
    },
    order_status_breakdown: {
      pending: pendingOrders,
      accepted: orders.filter(o => o.status === 'accepted').length,
      preparing: preparingOrders,
      assigned: orders.filter(o => o.status === 'assigned').length,
      delivering: deliveringOrders,
      delivered: completedOrders,
      declined: declinedOrders
    },
    recent_orders: recentOrders.map(order => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: parseFloat(order.total_amount || 0),
      client_name: order.client ? `${order.client.first_name} ${order.client.last_name}` : 'N/A',
      created_at: order.created_at
    })),
    period: {
      from: date_from || null,
      to: date_to || null
    }
  };
};

/**
 * Get restaurant's complete profile data
 */
export const getRestaurantProfile = async (id) => {
  const restaurant = await Restaurant.findOne({ 
    where: { id }
  });

  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  const coords = restaurant.location?.coordinates || [];

  return {
    id: restaurant.id,
    user_id: restaurant.user_id,
    name: restaurant.name,
    description: restaurant.description,
    address: restaurant.address,
    location: {
      type: restaurant.location?.type || null,
      coordinates: restaurant.location?.coordinates || null,
      lat: coords[1] || null,
      lng: coords[0] || null
    },
    rating: restaurant.rating ? parseFloat(restaurant.rating) : 0.0,
    image_url: restaurant.image_url,
    phone_number: restaurant.phone_number,
    email: restaurant.email || null,
    is_active: restaurant.is_active,
    is_premium: restaurant.is_premium,
    status: restaurant.status,
    opening_hours: restaurant.opening_hours,
    categories: restaurant.categories,
    is_open: restaurant.isOpen(),
    created_at: restaurant.created_at,
    updated_at: restaurant.updated_at
  };
};



// src/services/restaurant.service.js
export const getRestaurantOrdersHistory = async (restaurantId, filters = {}) => {
  const {
    status,
    date_range,
    date_from,
    date_to,
    min_price,
    max_price,
    search,
    page = 1,
    limit = 20,
    order_type
  } = filters;

  // Validate restaurant exists
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) {
    throw { status: 404, message: "Restaurant not found" };
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const where = { restaurant_id: restaurantId };

  // ==================== STATUS FILTER ====================
  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    const validStatuses = ['pending', 'accepted', 'preparing', 'assigned', 'arrived', 'delivering', 'delivered', 'declined'];
    const filteredStatuses = statusArray.filter(s => validStatuses.includes(s));
    
    if (filteredStatuses.length > 0) {
      where.status = { [Op.in]: filteredStatuses };
    }
  }

  // ==================== ORDER TYPE FILTER ====================
  if (order_type) {
    where.order_type = order_type;
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

  // ==================== QUERY WITH COMPLETE INCLUDES (comme getOrderById) ====================
  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: Restaurant,
        as: 'restaurant',
        // Tous les champs du restaurant (comme getOrderById)
      },
      {
        model: Client,
        as: 'client',
        // Tous les champs du client (comme getOrderById)
      },
      {
        model: Driver,
        as: 'driver',
        // Tous les champs du driver (comme getOrderById)
        required: false
      },
      {
        model: OrderItem,
        as: 'order_items',
        include: [{
          model: MenuItem,
          as: 'menu_item',
          // Tous les champs du menu_item (comme getOrderById)
        }]
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset
  });

  // ==================== CALCULATE SUMMARY ====================
  const allOrders = await Order.findAll({
    where: { restaurant_id: restaurantId },
    attributes: ['status', 'total_amount', 'order_type']
  });

  const summary = {
    total_orders: allOrders.length,
    total_revenue: allOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
    pending_orders: allOrders.filter(o => o.status === 'pending').length,
    accepted_orders: allOrders.filter(o => o.status === 'accepted').length,
    preparing_orders: allOrders.filter(o => o.status === 'preparing').length,
    delivering_orders: allOrders.filter(o => ['assigned', 'delivering'].includes(o.status)).length,
    delivered_orders: allOrders.filter(o => o.status === 'delivered').length,
    declined_orders: allOrders.filter(o => o.status === 'declined').length,
    pickup_orders: allOrders.filter(o => o.order_type === 'pickup').length,
    delivery_orders: allOrders.filter(o => o.order_type === 'delivery').length
  };

  // ==================== FORMAT RESPONSE (FORMAT IDENTIQUE À getOrderById) ====================
  const formattedOrders = rows.map(order => {
    // Conversion en JSON (comme getOrderById)
    const orderJSON = order.toJSON();

    // Extraire les coordonnées du restaurant
    const restaurantCoords = order.restaurant?.location?.coordinates || [];
    
    // Extraire les coordonnées de livraison
    const deliveryCoords = order.delivery_location?.coordinates || [];

    return {
      // ✅ Tous les champs de l'ordre (comme getOrderById)
      id: order.id,
      order_number: order.order_number,
      client_id: order.client_id,
      restaurant_id: order.restaurant_id,
      order_type: order.order_type,
      status: order.status,
      livreur_id: order.livreur_id,
      
      // Montants
      subtotal: parseFloat(order.subtotal || 0),
      delivery_fee: parseFloat(order.delivery_fee || 0),
      total_amount: parseFloat(order.total_amount || 0),
      delivery_distance: order.delivery_distance ? parseFloat(order.delivery_distance) : null,
      
      // Adresses et localisation
      delivery_address: order.delivery_address,
      delivery_location: deliveryCoords.length === 2 ? {
        type: 'Point',
        coordinates: deliveryCoords,
        lat: deliveryCoords[1],
        lng: deliveryCoords[0]
      } : null,
      
      delivery_instructions: order.delivery_instructions,
      payment_method: order.payment_method,
      preparation_time: order.preparation_time,
      
      // Timestamps
      estimated_delivery_time: order.estimated_delivery_time,
      created_at: order.created_at,
      updated_at: order.updated_at,
      accepted_at: order.accepted_at,
      preparing_started_at: order.preparing_started_at,
      assigned_at: order.assigned_at,
      delivering_started_at: order.delivering_started_at,
      delivered_at: order.delivered_at,
      
      // Rating
      rating: order.rating ? parseFloat(order.rating) : null,
      review_comment: order.review_comment,
      decline_reason: order.decline_reason,
      
      // ✅ Restaurant complet (comme getOrderById)
      restaurant: {
        id: order.restaurant.id,
        user_id: order.restaurant.user_id,
        name: order.restaurant.name,
        description: order.restaurant.description,
        address: order.restaurant.address,
        phone_number: order.restaurant.phone_number,
        email: order.restaurant.email,
        location: restaurantCoords.length === 2 ? {
          type: 'Point',
          coordinates: restaurantCoords,
          lat: restaurantCoords[1],
          lng: restaurantCoords[0]
        } : null,
        rating: order.restaurant.rating ? parseFloat(order.restaurant.rating) : null,
        image_url: order.restaurant.image_url,
        is_active: order.restaurant.is_active,
        is_premium: order.restaurant.is_premium,
        status: order.restaurant.status,
        opening_hours: order.restaurant.opening_hours,
        categories: order.restaurant.categories,
        created_at: order.restaurant.created_at,
        updated_at: order.restaurant.updated_at
      },

      // ✅ Client complet (comme getOrderById)
      client: {
        id: order.client.id,
        user_id: order.client.user_id,
        first_name: order.client.first_name,
        last_name: order.client.last_name,
        email: order.client.email,
        phone_number: order.client.phone_number,
        address: order.client.address,
        profile_image_url: order.client.profile_image_url,
        loyalty_points: order.client.loyalty_points,
        is_verified: order.client.is_verified,
        is_active: order.client.is_active,
        status: order.client.status,
        created_at: order.client.created_at,
        updated_at: order.client.updated_at,
        // Helper pour obtenir le nom complet
        full_name: `${order.client.first_name} ${order.client.last_name}`
      },

      // ✅ Driver complet (comme getOrderById) - peut être null
      driver: order.driver ? {
        id: order.driver.id,
        user_id: order.driver.user_id,
        driver_code: order.driver.driver_code,
        first_name: order.driver.first_name,
        last_name: order.driver.last_name,
        phone: order.driver.phone,
        email: order.driver.email,
        vehicle_type: order.driver.vehicle_type,
        vehicle_plate: order.driver.vehicle_plate,
        license_number: order.driver.license_number,
        status: order.driver.status,
        current_location: order.driver.current_location,
        rating: order.driver.rating ? parseFloat(order.driver.rating) : null,
        total_deliveries: order.driver.total_deliveries,
        cancellation_count: order.driver.cancellation_count,
        active_orders: order.driver.active_orders,
        max_orders_capacity: order.driver.max_orders_capacity,
        is_verified: order.driver.is_verified,
        is_active: order.driver.is_active,
        profile_image_url: order.driver.profile_image_url,
        last_active_at: order.driver.last_active_at,
        created_at: order.driver.created_at,
        updated_at: order.driver.updated_at,
        // Helper pour obtenir le nom complet
        full_name: `${order.driver.first_name} ${order.driver.last_name}`
      } : null,

      // ✅ Order items complets (comme getOrderById)
      order_items: order.order_items.map(item => ({
        id: item.id,
        order_id: item.order_id,
        menu_item_id: item.menu_item_id,
        quantite: item.quantite,
        prix_unitaire: parseFloat(item.prix_unitaire),
        prix_total: parseFloat(item.prix_total),
        instructions_speciales: item.instructions_speciales,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // Menu item complet
        menu_item: item.menu_item ? {
          id: item.menu_item.id,
          category_id: item.menu_item.category_id,
          nom: item.menu_item.nom,
          description: item.menu_item.description,
          prix: parseFloat(item.menu_item.prix),
          photo_url: item.menu_item.photo_url,
          is_available: item.menu_item.is_available,
          temps_preparation: item.menu_item.temps_preparation,
          created_at: item.menu_item.created_at,
          updated_at: item.menu_item.updated_at
        } : null
      }))
    };
  });

  return {
    orders: formattedOrders,
    pagination: {
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(count / parseInt(limit, 10)),
      total_items: count,
      items_per_page: parseInt(limit, 10)
    },
    summary,
    filters_applied: {
      status: status || 'all',
      date_range: date_range || 'all',
      date_from: date_from || null,
      date_to: date_to || null,
      min_price: min_price || null,
      max_price: max_price || null,
      search: search || null,
      order_type: order_type || 'all'
    }
  };
};