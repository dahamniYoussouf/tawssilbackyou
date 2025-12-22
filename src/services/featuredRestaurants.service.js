// src/services/featuredRestaurants.service.js
import { Op, literal } from "sequelize";
import Restaurant from "../models/Restaurant.js";
import HomeCategory from "../models/HomeCategory.js";
import { serializeHomeCategories, extractHomeCategorySlugs } from "./restaurantCategory.service.js";
import { sequelize } from "../config/database.js";

/**
 * Shuffle array randomly (Fisher-Yates algorithm)
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Get featured premium restaurants (nearby + random order)
 * @param {Object} options - Configuration options
 * @param {number} options.lat - User latitude
 * @param {number} options.lng - User longitude
 * @param {number} options.radius - Search radius in meters (default: 10000)
 * @param {number} options.limit - Maximum number of restaurants to return (default: 6)
 * @returns {Promise<Array>} Featured premium restaurants
 */
export const getFeaturedPremiumRestaurants = async (options = {}) => {
  const {
    lat,
    lng,
    radius = 10000, // 10km by default for featured restaurants
    limit = 6
  } = options;

  try {
    // If no coordinates provided, get all premium restaurants
    if (!lat || !lng) {
      return await getAllPremiumRestaurants(limit);
    }

    // Get nearby premium restaurants using PostGIS
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.warn('Invalid coordinates for featured restaurants, falling back to all premium');
      return await getAllPremiumRestaurants(limit);
    }

    const point = `ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography`;
    
    // Query to get nearby premium restaurants
    const restaurants = await Restaurant.findAll({
      attributes: [
        'id',
        'name',
        'description',
        'address',
        'location',
        'rating',
        'image_url',
        'is_premium',
        'status',
        'opening_hours',
        'email',
        'phone_number',
        [literal(`ST_Distance(location, ${point})`), 'distance']
      ],
      where: {
        is_active: true,
        status: 'approved',
        is_premium: true, // Only premium restaurants
        [Op.and]: [
          literal(`ST_DWithin(location, ${point}, :radius)`)
        ]
      },
      include: [{
        model: HomeCategory,
        as: "home_categories",
        attributes: ["id", "name", "slug", "description", "image_url", "display_order"],
        through: { attributes: [] },
        required: false
      }],
      replacements: {
        lat: latitude,
        lng: longitude,
        radius
      },
      limit: limit * 3, // Get more to shuffle
      raw: false
    });

    // If not enough nearby premium restaurants, add more from other areas
    if (restaurants.length < limit) {
      const additionalRestaurants = await Restaurant.findAll({
        attributes: [
          'id',
          'name',
          'description',
          'address',
          'location',
          'rating',
          'image_url',
          'is_premium',
          'status',
          'opening_hours',
          'email',
          'phone_number'
        ],
        where: {
          is_active: true,
          status: 'approved',
          is_premium: true,
          id: { [Op.notIn]: restaurants.map(r => r.id) } // Exclude already selected
        },
        include: [{
          model: HomeCategory,
          as: "home_categories",
          attributes: ["id", "name", "slug", "description", "image_url", "display_order"],
          through: { attributes: [] },
          required: false
        }],
        limit: limit * 2,
        order: [['rating', 'DESC']]
      });

      restaurants.push(...additionalRestaurants);
    }

    // Format and shuffle restaurants
    const formatted = formatRestaurants(restaurants, latitude, longitude);
    const shuffled = shuffleArray(formatted);

    return shuffled.slice(0, limit);

  } catch (error) {
    console.error('Error fetching featured premium restaurants:', error);
    // Fallback to all premium restaurants
    return await getAllPremiumRestaurants(limit);
  }
};

/**
 * Get all premium restaurants (fallback when no location provided)
 * @param {number} limit - Maximum number of restaurants
 * @returns {Promise<Array>} Premium restaurants
 */
const getAllPremiumRestaurants = async (limit = 6) => {
  const restaurants = await Restaurant.findAll({
    attributes: [
      'id',
      'name',
      'description',
      'address',
      'location',
      'rating',
      'image_url',
      'is_premium',
      'status',
      'opening_hours',
      'email',
      'phone_number'
    ],
    where: {
      is_active: true,
      status: 'approved',
      is_premium: true
    },
    include: [{
      model: HomeCategory,
      as: "home_categories",
      attributes: ["id", "name", "slug", "description", "image_url", "display_order"],
      through: { attributes: [] },
      required: false
    }],
    limit: limit * 2, // Get more to shuffle
    order: [['rating', 'DESC']]
  });

  const formatted = formatRestaurants(restaurants);
  const shuffled = shuffleArray(formatted);

  return shuffled.slice(0, limit);
};

/**
 * Format restaurant data for response
 * @param {Array} restaurants - Raw restaurant data
 * @param {number} userLat - User latitude (optional)
 * @param {number} userLng - User longitude (optional)
 * @returns {Array} Formatted restaurants
 */
const formatRestaurants = (restaurants, userLat = null, userLng = null) => {
  return restaurants.map(restaurant => {
    const coords = restaurant.location?.coordinates || [];
    const homeCategories = serializeHomeCategories(restaurant.home_categories || []);
    
    // Calculate distance if user location provided
    let distance = null;
    if (userLat && userLng && coords.length === 2) {
      distance = restaurant.dataValues?.distance || null;
    }

    return {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      address: restaurant.address,
      lat: coords[1] || null,
      lng: coords[0] || null,
      rating: restaurant.rating ? parseFloat(restaurant.rating) : 0,
      image_url: restaurant.image_url,
      is_premium: restaurant.is_premium,
      status: restaurant.status,
      is_open: typeof restaurant.isOpen === 'function' ? restaurant.isOpen() : true,
      home_categories: homeCategories,
      categories: extractHomeCategorySlugs(homeCategories),
      email: restaurant.email || null,
      phone_number: restaurant.phone_number || null,
      distance: distance ? parseFloat((distance / 1000).toFixed(2)) : null, // Convert to km
      featured: true // Flag to identify featured restaurants
    };
  });
};

export default {
  getFeaturedPremiumRestaurants,
  getAllPremiumRestaurants
};