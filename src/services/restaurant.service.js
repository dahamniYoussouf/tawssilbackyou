import Restaurant from "../models/Restaurant.js";
import FavoriteRestaurant from "../models/FavoriteRestaurant.js";
import FoodCategory from "../models/FoodCategory.js";
import MenuItem from "../models/MenuItem.js";
import Client from "../models/Client.js";
import Order from "../models/Order.js";
import { Op, literal } from "sequelize";
import axios from "axios";
import calculateRouteTime from "../services/routingService.js"
import FavoriteMeal from "../models/FavoriteMeal.js";



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
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: address, format: "json", limit: 1 },
      headers: { "User-Agent": "food-delivery-app" }
    });

    if (response.data.length === 0) {
      throw new Error("Address not found");
    }

    latitude = parseFloat(response.data[0].lat);
    longitude = parseFloat(response.data[0].lon);
  }
  // Handle coordinate-based search
  else if (lat && lng) {
    latitude = parseFloat(lat);
    longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error("Invalid coordinates");
    }
  }
  // Neither provided
  else {
    throw new Error("Address or coordinates required");
  }

  const searchRadius = parseInt(radius, 10);

  // Base WHERE conditions
  const whereConditions = {
    [Op.and]: [
      { is_active: true },
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
const formatted = await Promise.all(result.map(async (r) => {
    const coords = r.location?.coordinates || [];
      const route = await calculateRouteTime(longitude, latitude, coords[0], coords[1], 40);
    const favoriteUuid = favoriteMap.get(r.id) || null;

    const prepTime = 15;

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      address: r.address,
      lat: coords[1] || null,
      lng: coords[0] || null,
      rating: r.rating,
      delivery_time_min: prepTime + route.timeMin,
      delivery_time_max: prepTime + route.timeMax,
      image_url: r.image_url,
      distance: r.dataValues.distance,
      is_premium: r.is_premium,
      status: r.status,
      is_open: r.isOpen(),
      categories: r.categories, // Changed from category object
      favorite_uuid: favoriteUuid
    };
  }))

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


/**
 * Get nearby restaurant names only
 */
export const getNearbyRestaurantNames = async (filters) => {
  const { address, lat, lng, radius = 2000 } = filters;

  let latitude, longitude;

  // Geocode if address provided
  if (address && address.trim()) {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: address, format: "json", limit: 1 },
      headers: { "User-Agent": "food-delivery-app" }
    });

    if (response.data.length === 0) {
      throw new Error("Address not found");
    }

    latitude = parseFloat(response.data[0].lat);
    longitude = parseFloat(response.data[0].lon);
  }
  // Use coordinates
  else if (lat && lng) {
    latitude = parseFloat(lat);
    longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error("Invalid coordinates");
    }
  }
  // Neither provided
  else {
    throw new Error("Address or coordinates required");
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
    categories // Added
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
    ...(categories && { categories }) // Only update if provided
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