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

  const modules = {
    homeCategories,
    thematicSelections,
    recommendedDishes,
    dailyDeals,
    promotions,
    announcements,
    featuredRestaurants // ✅ NEW: Featured premium restaurants
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