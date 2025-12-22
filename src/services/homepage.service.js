// src/services/homepage.service.js
import {
  listHomeCategories
} from "./homeCategory.service.js";
import {
  listThematicSelections
} from "./thematicSelection.service.js";
import {
  listRecommendedDishes
} from "./recommendedDish.service.js";
import {
  listDailyDeals
} from "./dailyDeal.service.js";
import {
  listPromotions
} from "./promotion.service.js";
import {
  getActiveAnnouncements
} from "./announcement.service.js";
import {
  getFeaturedPremiumRestaurants
} from "./featuredRestaurants.service.js";
import cacheService from "./cache.service.js";

const HOMEPAGE_MODULES_CACHE_KEY = "homepage:modules:v2"; // Incremented version
const HOMEPAGE_MODULES_CACHE_TTL = 60; // seconds


const enrichThematicSelectionsWithRestaurants = async (thematicSelections) => {
  if (!thematicSelections || thematicSelections.length === 0) {
    return [];
  }

  // Import Restaurant model dynamically to avoid circular dependencies
  const { default: Restaurant } = await import("../models/Restaurant.js");
  const { serializeHomeCategories, extractHomeCategorySlugs } = await import("./restaurantCategory.service.js");
  const { default: HomeCategory } = await import("../models/HomeCategory.js");

  // Get all unique home_category_ids from thematic selections
  const categoryIds = [...new Set(
    thematicSelections
      .map(selection => selection.home_category_id)
      .filter(Boolean)
  )];

  if (categoryIds.length === 0) {
    return thematicSelections;
  }

  // Fetch restaurants for each category
  const restaurantsByCategoryPromises = categoryIds.map(async (categoryId) => {
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
      include: [
        {
          model: HomeCategory,
          as: "home_categories",
          where: { id: categoryId },
          attributes: ["id", "name", "slug", "description", "image_url", "display_order"],
          through: { attributes: [] }
        }
      ],
      where: {
        is_active: true,
        status: 'approved'
      },
      limit: 10, // Limit restaurants per thematic selection
      order: [
        ['is_premium', 'DESC'],
        ['rating', 'DESC']
      ]
    });

    return {
      categoryId,
      restaurants: restaurants.map(restaurant => {
        // ✅ Convert to plain JSON to avoid circular references
        const restaurantJson = restaurant.toJSON();
        const coords = restaurantJson.location?.coordinates || [];
        const homeCategories = serializeHomeCategories(restaurantJson.home_categories || []);
        
        return {
          id: restaurantJson.id,
          name: restaurantJson.name,
          description: restaurantJson.description,
          address: restaurantJson.address,
          lat: coords[1] || null,
          lng: coords[0] || null,
          rating: restaurantJson.rating ? parseFloat(restaurantJson.rating) : 0,
          image_url: restaurantJson.image_url,
          is_premium: restaurantJson.is_premium,
          status: restaurantJson.status,
          is_open: typeof restaurant.isOpen === 'function' ? restaurant.isOpen() : true,
          home_categories: homeCategories,
          categories: extractHomeCategorySlugs(homeCategories),
          email: restaurantJson.email || null,
          phone_number: restaurantJson.phone_number || null
        };
      })
    };
  });

  const restaurantsByCategory = await Promise.all(restaurantsByCategoryPromises);

  // Create a map for quick lookup
  const restaurantsMap = new Map(
    restaurantsByCategory.map(({ categoryId, restaurants }) => [categoryId, restaurants])
  );

  // Enrich thematic selections with restaurants
  // ✅ Convert selections to plain JSON to avoid circular references
  return thematicSelections.map(selection => {
    const selectionJson = typeof selection.toJSON === 'function' ? selection.toJSON() : selection;
    
    return {
      ...selectionJson,
      restaurants: restaurantsMap.get(selectionJson.home_category_id) || [],
      restaurants_count: (restaurantsMap.get(selectionJson.home_category_id) || []).length
    };
  });
};

/**
 * Get homepage modules with optional location for featured restaurants
 * @param {Object} options - Configuration options
 * @param {number} options.lat - User latitude (optional)
 * @param {number} options.lng - User longitude (optional)
 * @param {number} options.featuredRadius - Radius for featured restaurants (default: 10000m)
 * @param {number} options.featuredLimit - Max featured restaurants (default: 6)
 * @returns {Promise<Object>} Homepage modules
 */
export const getHomepageModules = async (options = {}) => {
  const {
    lat,
    lng,
    featuredRadius = 10000,
    featuredLimit = 6
  } = options;

  // Create cache key with location if provided
  const cacheKey = lat && lng 
    ? `${HOMEPAGE_MODULES_CACHE_KEY}:${lat}:${lng}:${featuredRadius}`
    : HOMEPAGE_MODULES_CACHE_KEY;

  const cached = await cacheService.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const now = new Date().toISOString();
  
  // Fetch all modules in parallel
  const [
    homeCategories,
    thematicSelections,
    recommendedDishes,
    dailyDeals,
    promotions,
    announcements,
    featuredRestaurants
  ] = await Promise.all([
    listHomeCategories({ activeOnly: true }),
    listThematicSelections({ activeOnly: true }),
    listRecommendedDishes({ activeOnly: true }),
    listDailyDeals({ activeOnly: true }),
    listPromotions({
      is_active: true,
      active_on: now
    }),
    getActiveAnnouncements(),
    getFeaturedPremiumRestaurants({
      lat,
      lng,
      radius: featuredRadius,
      limit: featuredLimit
    })
  ]);

  // ✅ Enrich thematic selections with restaurants
  const enrichedThematicSelections = await enrichThematicSelectionsWithRestaurants(thematicSelections);

  const modules = {
    homeCategories,
    thematicSelections: enrichedThematicSelections,
    recommendedDishes,
    dailyDeals,
    promotions,
    announcements,
    featuredRestaurants
  };

  // Cache with shorter TTL if location-based (featured restaurants are randomized)
  const ttl = lat && lng ? 30 : HOMEPAGE_MODULES_CACHE_TTL;
  await cacheService.set(cacheKey, modules, ttl);

  return modules;
};

/**
 * Clear homepage modules cache
 * Clears all cached versions (with and without location)
 */
export const clearHomepageModulesCache = async () => {
  await cacheService.delPattern('homepage:modules:*');
};