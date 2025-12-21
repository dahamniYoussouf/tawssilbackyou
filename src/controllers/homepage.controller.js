// src/controllers/homepage.controller.js
import * as restaurantService from "../services/restaurant.service.js";
import { getHomepageModules } from "../services/homepage.service.js";

const normalizeCategories = (categories) => {
  if (!categories) return undefined;
  if (Array.isArray(categories)) return categories;
  if (typeof categories === "string") {
    return categories.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
};

const parseNumberParam = (value) => {
  if (value === undefined || value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseIntegerParam = (value) => {
  if (value === undefined || value === null) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const DEFAULT_HOME_COORDS = { lat: 36.747385, lng: 6.27404 };
const DEFAULT_RADIUS = 5000;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

const buildNearbyFilters = (source = {}) => {
  const lat = parseNumberParam(source.lat);
  const lng = parseNumberParam(source.lng);
  const address = typeof source.address === "string" && source.address.trim()
    ? source.address.trim()
    : undefined;
  const radius = parseIntegerParam(source.radius) || DEFAULT_RADIUS;
  const page = parseIntegerParam(source.page) || DEFAULT_PAGE;
  const pageSize = parseIntegerParam(source.pageSize) || DEFAULT_PAGE_SIZE;
  const q = typeof source.q === "string" && source.q.trim() ? source.q.trim() : undefined;
  const categories = normalizeCategories(source.categories);

  const filters = {
    radius,
    page,
    pageSize,
    client_id: null
  };

  if (address) {
    filters.address = address;
  } else {
    filters.lat = lat ?? DEFAULT_HOME_COORDS.lat;
    filters.lng = lng ?? DEFAULT_HOME_COORDS.lng;
  }

  if (q) {
    filters.q = q;
  }

  if (categories?.length) {
    filters.categories = categories;
  }

  return filters;
};

const buildNearbyResponse = (nearby) => ({
  count: nearby.count,
  page: nearby.page,
  pageSize: nearby.pageSize,
  radius: nearby.radius,
  center: nearby.center,
  searchType: nearby.searchType,
  data: nearby.formatted
});

/**
 * ✅ Filter homepage modules to show only items from nearby restaurants
 */
const filterModulesByNearbyRestaurants = (modules, nearbyRestaurantIds) => {
  if (!nearbyRestaurantIds || nearbyRestaurantIds.length === 0) {
    return {
      homeCategories: modules.homeCategories || [],
      thematicSelections: modules.thematicSelections || [],
      recommendedDishes: [],
      dailyDeals: [],
      promotions: [],
      announcements: []
    };
  }

  const restaurantIdSet = new Set(nearbyRestaurantIds.map(id => String(id)));

  // Filter recommended dishes
  const recommendedDishes = (modules.recommendedDishes || []).filter(dish => {
    return dish.restaurant_id && restaurantIdSet.has(String(dish.restaurant_id));
  });

  // Filter daily deals
  const dailyDeals = (modules.dailyDeals || []).filter(deal => {
    const promotionRestaurantId = deal.promotion?.restaurant_id;
    return promotionRestaurantId && restaurantIdSet.has(String(promotionRestaurantId));
  });

  // Filter promotions
  const promotions = (modules.promotions || []).filter(promo => {
    // Include global promotions (no restaurant_id)
    if (!promo.restaurant_id && promo.scope === 'global') return true;
    
    // Include promotions from nearby restaurants
    if (promo.restaurant_id && restaurantIdSet.has(String(promo.restaurant_id))) return true;
    
    return false;
  });

  // Filter announcements
  const announcements = (modules.announcements || []).filter(announcement => {
    // Include global announcements (no restaurant_id)
    if (!announcement.restaurant_id) return true;
    
    // Include announcements from nearby restaurants
    if (announcement.restaurant_id && restaurantIdSet.has(String(announcement.restaurant_id))) {
      return true;
    }
    
    return false;
  });

  return {
    homeCategories: modules.homeCategories || [],
    thematicSelections: modules.thematicSelections || [],
    recommendedDishes,
    dailyDeals,
    promotions,
    announcements
  };
};

const buildHomepagePayload = (modules, nearby) => {
  // Extract nearby restaurant IDs
  const nearbyRestaurantIds = (nearby.formatted || []).map(restaurant => restaurant.id);
  
  // Filter modules to show only items from nearby restaurants
  const filteredModules = filterModulesByNearbyRestaurants(modules, nearbyRestaurantIds);
  
  return {
    ...filteredModules,
    nearby: buildNearbyResponse(nearby)
  };
};

export const getHomepageOverview = async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      categories: normalizeCategories(req.body.categories),
      client_id: req.user?.client_id
    };

    if (!body.client_id) {
      return res.status(400).json({
        success: false,
        message: "Client profile not found"
      });
    }

    const modulesPromise = getHomepageModules();
    const nearbyPromise = restaurantService.filterNearbyRestaurants(body);

    const [modules, nearby] = await Promise.all([modulesPromise, nearbyPromise]);

    res.json({
      success: true,
      data: buildHomepagePayload(modules, nearby)
    });
  } catch (err) {
    next(err);
  }
};

const respondWithModules = async (filters, res, next) => {
  try {
    const modules = await getHomepageModules();
    const nearbyFilters = buildNearbyFilters(filters);
    const nearby = await restaurantService.filterNearbyRestaurants(nearbyFilters);

    res.json({
      success: true,
      data: buildHomepagePayload(modules, nearby)
    });
  } catch (err) {
    next(err);
  }
};

export const getHomepageModulesForClient = async (req, res, next) => {
  return respondWithModules(req.query, res, next);
};

export const postHomepageModulesForClient = async (req, res, next) => {
  return respondWithModules(req.body, res, next);
};

export { normalizeCategories, buildNearbyFilters };