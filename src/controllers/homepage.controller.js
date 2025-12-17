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
      data: {
        ...modules,
        nearby: {
          count: nearby.count,
          page: nearby.page,
          pageSize: nearby.pageSize,
          radius: nearby.radius,
          center: nearby.center,
          searchType: nearby.searchType,
          data: nearby.formatted
        }
      }
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
      data: {
        ...modules,
        nearby: {
          count: nearby.count,
          page: nearby.page,
          pageSize: nearby.pageSize,
          radius: nearby.radius,
          center: nearby.center,
          searchType: nearby.searchType,
          data: nearby.formatted
        }
      }
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
