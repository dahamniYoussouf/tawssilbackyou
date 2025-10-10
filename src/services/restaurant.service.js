import Restaurant from "../models/Restaurant.js";
import FavoriteRestaurant from "../models/FavoriteRestaurant.js";
import FoodCategory from "../models/FoodCategory.js";
import MenuItem from "../models/MenuItem.js";
import { Op, literal } from "sequelize";
import axios from "axios";
import calculateRouteTime from "../services/routingService.js"

/**
 * Create a new restaurant
 */
export const createRestaurant = async (data) => {
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
    categories // Changed from category_id
  } = data;

  // Validate categories array
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    throw new Error("At least one category is required");
  }

  return await Restaurant.create({
    name,
    description,
    address,
    location: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
    rating,
    image_url,
    is_active,
    is_premium,
    status,
    opening_hours,
    categories // Changed from category_id
  });
};

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

  // Fetch all categories for this restaurant with their menu items
  const categories = await FoodCategory.findAll({
    where: { restaurant_id: restaurantId },
    include: [{
      model: MenuItem,
      as: 'items', // Make sure this association exists in your models
      where: { is_available: true }, // Only include available items
      required: false, // Include categories even if they have no items
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

  // If client_id is provided, fetch their favorite meals
  let favoritesMap = new Map();
  if (clientId) {
    const allMenuItemIds = categories.flatMap(cat => 
      cat.menuItems ? cat.menuItems.map(item => item.id) : []
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
    items: category.items ? category.items.map(item => ({
      id: item.id,
      nom: item.nom,
      description: item.description,
      prix: parseFloat(item.prix),
      photo_url: item.photo_url,
      temps_preparation: item.temps_preparation,
      is_available: item.is_available,
      is_favorite: favoritesMap.has(item.id),
      favorite_id: favoritesMap.get(item.id) || null
    })) : [],
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