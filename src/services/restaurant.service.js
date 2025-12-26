import crypto from "crypto";
import Restaurant from "../models/Restaurant.js";
import FavoriteRestaurant from "../models/FavoriteRestaurant.js";
import FoodCategory from "../models/FoodCategory.js";
import MenuItem from "../models/MenuItem.js";
import Addition from "../models/Addition.js";
import Client from "../models/Client.js";
import Order from "../models/Order.js";
import { Op, QueryTypes, literal, Sequelize } from "sequelize";
import axios from "axios";
import FavoriteMeal from "../models/FavoriteMeal.js";
import OrderItem from "../models/OrderItem.js";
import OrderItemAddition from "../models/OrderItemAddition.js";
import Driver from "../models/Driver.js";
import User from "../models/User.js";
import HomeCategory from "../models/HomeCategory.js";
import SystemConfig from "../models/SystemConfig.js";
import { sequelize } from "../config/database.js";
import cacheService from "./cache.service.js";
import { normalizeCategoryList } from "../utils/slug.js";
import { listPromotions } from "./promotion.service.js";
import {
  serializeHomeCategories,
  extractHomeCategorySlugs,
  syncRestaurantHomeCategories
} from "./restaurantCategory.service.js";
import { hydrateOrderItemsWithActivePromotions } from "./orders/orderEnrichment.helper.js";

const NEARBY_CACHE_TTL = 60; // seconds
const METERS_PER_DEGREE = 111320;
const MIN_TILE_METERS = 500;
const CLIENT_RESTAURANT_SEARCH_RADIUS_KEY = "client_restaurant_search_radius";
const DEFAULT_CLIENT_RESTAURANT_SEARCH_RADIUS = 2000;
const CLIENT_RESTAURANT_SEARCH_RADIUS_MIN = 100;
const CLIENT_RESTAURANT_SEARCH_RADIUS_MAX = 50000;
const CLIENT_RESTAURANT_SEARCH_RADIUS_CACHE_TTL_MS = 60_000;

let clientRestaurantSearchRadiusCache = {
  value: DEFAULT_CLIENT_RESTAURANT_SEARCH_RADIUS,
  expiresAt: 0
};

const normalizeQueryKey = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const roundMoney = (value) => Number(Number(value ?? 0).toFixed(2));

const normalizeRadiusMeters = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolveClientRestaurantSearchRadius = async (requestedRadius) => {
  const parsedRequest = normalizeRadiusMeters(requestedRadius);

  if (parsedRequest !== null) {
    if (
      parsedRequest < CLIENT_RESTAURANT_SEARCH_RADIUS_MIN ||
      parsedRequest > CLIENT_RESTAURANT_SEARCH_RADIUS_MAX
    ) {
      const error = new Error(
        `Radius must be between ${CLIENT_RESTAURANT_SEARCH_RADIUS_MIN} and ${CLIENT_RESTAURANT_SEARCH_RADIUS_MAX} meters`
      );
      error.status = 400;
      throw error;
    }
    return parsedRequest;
  }

  const now = Date.now();
  if (now < clientRestaurantSearchRadiusCache.expiresAt) {
    return clientRestaurantSearchRadiusCache.value;
  }

  const configured = await SystemConfig.get(
    CLIENT_RESTAURANT_SEARCH_RADIUS_KEY,
    DEFAULT_CLIENT_RESTAURANT_SEARCH_RADIUS
  );

  const parsedConfigured = normalizeRadiusMeters(configured);
  const resolved =
    parsedConfigured !== null &&
    parsedConfigured >= CLIENT_RESTAURANT_SEARCH_RADIUS_MIN &&
    parsedConfigured <= CLIENT_RESTAURANT_SEARCH_RADIUS_MAX
      ? parsedConfigured
      : DEFAULT_CLIENT_RESTAURANT_SEARCH_RADIUS;

  clientRestaurantSearchRadiusCache = {
    value: resolved,
    expiresAt: now + CLIENT_RESTAURANT_SEARCH_RADIUS_CACHE_TTL_MS
  };

  return resolved;
};

const toDecimal = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 0;
  }
  return Number(value);
};

const buildRestaurantRatingMap = async (restaurantIds = []) => {
  const ids = (restaurantIds || []).map((id) => String(id).trim()).filter(Boolean);
  if (ids.length === 0) {
    return new Map();
  }

  const rows = await Order.findAll({
    attributes: [
      "restaurant_id",
      [Sequelize.fn("COUNT", Sequelize.col("Order.id")), "rating_count"],
      [Sequelize.fn("COUNT", Sequelize.fn("DISTINCT", Sequelize.col("client_id"))), "raters_count"]
    ],
    where: {
      restaurant_id: { [Op.in]: ids },
      rating: { [Op.not]: null }
    },
    group: ["restaurant_id"],
    raw: true
  });

  const map = new Map();
  rows.forEach((row) => {
    map.set(String(row.restaurant_id), {
      rating_count: Number(row.rating_count) || 0,
      raters_count: Number(row.raters_count) || 0
    });
  });
  return map;
};

const derivePromotionLabel = (promotion, discountValue) => {
  if (promotion.badge_text) {
    return promotion.badge_text;
  }

  switch (promotion.type) {
    case "percentage":
      return discountValue ? `-${discountValue}%` : promotion.title;
    case "amount":
      return discountValue ? `-${discountValue} ${promotion.currency || "DZD"}` : promotion.title;
    case "buy_x_get_y":
      if (promotion.buy_quantity && promotion.free_quantity) {
        return `Buy ${promotion.buy_quantity} get ${promotion.free_quantity}`;
      }
      break;
    case "free_delivery":
      return "Livraison gratuite";
    default:
      return promotion.custom_message || promotion.description || promotion.title;
  }

  return promotion.title;
};

const computeItemPromotionNewPrice = (basePrice, promotion) => {
  const oldPrice = basePrice;
  const discountValue = toDecimal(promotion.discount_value);
  let newPrice = oldPrice;

  if (promotion.type === "percentage" && discountValue > 0) {
    newPrice = oldPrice * (1 - discountValue / 100);
  } else if (promotion.type === "amount" && discountValue > 0) {
    newPrice = oldPrice - discountValue;
  }

  if (newPrice < 0) newPrice = 0;
  return roundMoney(newPrice);
};

const isPromotionApplicableToItem = (promotion, itemId, restaurantId) => {
  if (!promotion || !itemId) return false;
  const normalizedItemId = String(itemId);
  switch (promotion.scope) {
    case "menu_item":
      if (promotion.menu_item_id && String(promotion.menu_item_id) === normalizedItemId) {
        return true;
      }

      if (Array.isArray(promotion.menu_items)) {
        return promotion.menu_items.some((menuItem) => String(menuItem.id) === normalizedItemId);
      }

      // Backward compatibility: promotions created with a restaurant_id but without scope/menu items
      // should still behave like restaurant-level promotions.
      if (
        promotion.restaurant_id &&
        restaurantId &&
        String(promotion.restaurant_id) === String(restaurantId) &&
        !promotion.menu_item_id &&
        (!Array.isArray(promotion.menu_items) || promotion.menu_items.length === 0)
      ) {
        return true;
      }
      return false;
    case "restaurant":
      return promotion.restaurant_id && String(promotion.restaurant_id) === String(restaurantId);
    case "global":
      return true;
    default:
      return false;
  }
};

const getApplicableItemPromotions = (promotions, item, restaurantId) => {
  const basePrice = toDecimal(item.prix);
  const normalizedItemId = String(item.id);
  return promotions
    .filter((promotion) => isPromotionApplicableToItem(promotion, normalizedItemId, restaurantId))
    .map((promotion) => {
      const newPrice = computeItemPromotionNewPrice(basePrice, promotion);
      const savings = roundMoney(Math.max(0, basePrice - newPrice));
      const currency = promotion.currency || "DZD";
      return {
        id: promotion.id,
        title: promotion.title,
        badge_text: derivePromotionLabel(promotion, toDecimal(promotion.discount_value)),
        description: promotion.custom_message || promotion.description,
        type: promotion.type,
        scope: promotion.scope,
        currency,
        old_price: roundMoney(basePrice),
        new_price: newPrice,
        discount_value: promotion.discount_value ? toDecimal(promotion.discount_value) : null,
        saving_text: savings > 0 ? `${savings} ${currency}` : null,
        extra: promotion.type === "buy_x_get_y" && promotion.buy_quantity && promotion.free_quantity
          ? `Buy ${promotion.buy_quantity} get ${promotion.free_quantity}`
          : null
      };
    });
};

const buildNearbyCacheKey = ({
  latitude,
  longitude,
  radius,
  categories,
  home_categories,
  q,
  page,
  pageSize
}) => {
  const categoryList = Array.isArray(categories)
    ? categories
    : (categories ? [categories] : []);
  const normalizedCategories = categoryList
    .map((cat) => cat?.toString().trim())
    .filter(Boolean);
  normalizedCategories.sort();
  const categoriesKey = normalizedCategories.length ? normalizedCategories.join("|") : "all";

  const homeCategoryList = Array.isArray(home_categories)
    ? home_categories
    : (home_categories ? [home_categories] : []);
  const normalizedHomeCategories = homeCategoryList
    .map((cat) => cat?.toString().trim())
    .filter(Boolean);
  normalizedHomeCategories.sort();
  const homeCategoriesKey = normalizedHomeCategories.length ? normalizedHomeCategories.join("|") : "all";

  const queryKey = normalizeQueryKey(q) || "all";
  const tileSizeMeters = Math.max(radius, MIN_TILE_METERS);
  const tileSizeDegrees = Math.max(tileSizeMeters / METERS_PER_DEGREE, 0.0001);
  const latTile = Math.floor(latitude / tileSizeDegrees);
  const lngTile = Math.floor(longitude / tileSizeDegrees);

  return [
    "restaurant:nearby",
    `tile:${latTile}:${lngTile}`,
    `radius:${Math.round(radius)}`,
    `page:${page}`,
    `pageSize:${pageSize}`,
    `query:${queryKey}`,
    `cats:${categoriesKey}`,
    `homeCats:${homeCategoriesKey}`
  ].join(":");
};

const buildFavoriteMap = async (clientId) => {
  if (!clientId) {
    return new Map();
  }

  const favorites = await FavoriteRestaurant.findAll({
    where: { client_id: clientId },
    attributes: ["restaurant_id", "id"],
    raw: true
  });

  const map = new Map();
  favorites.forEach((fav) => map.set(fav.restaurant_id, fav.id));

  return map;
};

const applyFavoritesToRestaurants = (restaurants = [], favoriteMap = new Map()) => {
  return restaurants.map((restaurant) => ({
    ...restaurant,
    favorite_uuid: favoriteMap.get(restaurant.id) || null
  }));
};




/**
 * Fetch all restaurants with open/close status
 */
export const getAllRestaurants = async () => {
  const restaurants = await Restaurant.findAll({
    order: [["created_at", "DESC"]],
    include: [{
      model: HomeCategory,
      as: "home_categories",
      attributes: ["id", "name", "slug", "description", "image_url", "display_order"]
    }]
  });

  const ratingMap = await buildRestaurantRatingMap(restaurants.map((restaurant) => restaurant.id));

  return restaurants.map((r) => {
    const homeCategories = serializeHomeCategories(r.home_categories);
    const ratingStats = ratingMap.get(String(r.id)) || { rating_count: 0, raters_count: 0 };
    return {
      ...r.toJSON(),
      is_open: r.isOpen(),
      rating_count: ratingStats.rating_count,
      raters_count: ratingStats.raters_count,
      home_categories: homeCategories,
      categories: extractHomeCategorySlugs(homeCategories)
    };
  });
};

export const createRestaurant = async (payload) => {
  const {
    name,
    description,
    address,
    lat,
    lng,
    email,
    phone_number,
    categories,
    rating,
    image_url,
    is_active = true,
    is_premium = false,
    status = "pending",
    opening_hours
  } = payload;

  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid latitude or longitude");
  }

  const normalizedCategories = normalizeCategoryList(categories || []);
  if (normalizedCategories.length === 0) {
    throw new Error("At least one category is required");
  }

  const userEmail = email || `restaurant-${Date.now()}@tawssil.local`;
  const userPassword = payload.password || crypto.randomUUID?.() || String(Math.random()).slice(2, 12);
  const user = await User.create({
    email: userEmail,
    password: userPassword,
    role: "restaurant"
  });

  const restaurant = await Restaurant.create({
    user_id: user.id,
    name,
    description: description || null,
    address: address || null,
    phone_number: phone_number || null,
    email: email || null,
    location: {
      type: "Point",
      coordinates: [longitude, latitude]
    },
    rating: rating !== undefined ? parseFloat(rating) : 0.0,
    image_url: image_url || null,
    is_active,
    is_premium,
    status,
    opening_hours: opening_hours || null
  });

  await syncRestaurantHomeCategories(restaurant, normalizedCategories);
  await restaurant.reload({
    include: [{
      model: HomeCategory,
      as: "home_categories",
      attributes: [
        "id",
        "name",
        "slug",
        "description",
        "image_url",
        "display_order"
      ]
    }]
  });

  const restaurantJson = restaurant.toJSON();
  const homeCategories = serializeHomeCategories(restaurant.home_categories);
  return {
    ...restaurantJson,
    home_categories: homeCategories,
    categories: extractHomeCategorySlugs(homeCategories),
    uuid: restaurantJson.id,
    user_email: user.email
  };
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
    radius,
    q,
    categories,
    home_categories,
    page = 1,
    pageSize = 20
  } = filters;

  const normalizedCategoryFilter = normalizeCategoryList(
    Array.isArray(categories) ? categories : (categories ? [categories] : [])
  );

  let latitude, longitude;

  // Handle address-based search (geocoding)
  if (address && address.trim()) {
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: address, format: "json", limit: 1 },
        headers: { "User-Agent": "food-delivery-app" },
        timeout: 10000
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
      if (error.status) {
        throw error;
      }

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

      const geocodeError = new Error("Unable to geocode address. Please check the address or use coordinates.");
      geocodeError.status = 400;
      throw geocodeError;
    }
  }
  else if (lat && lng) {
    latitude = parseFloat(lat);
    longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      const error = new Error("Invalid coordinates");
      error.status = 400;
      throw error;
    }
  }
  else {
    const error = new Error("Address or coordinates required");
    error.status = 400;
    throw error;
  }

  const searchRadius = await resolveClientRestaurantSearchRadius(radius);
  const normalizedPage = Math.max(1, parseInt(page, 10) || 1);
  const normalizedPageSize = Math.max(1, parseInt(pageSize, 10) || 20);
  const limit = normalizedPageSize;
  const offset = (normalizedPage - 1) * limit;
  const favoriteMapPromise = buildFavoriteMap(client_id);
  const cacheKey = buildNearbyCacheKey({
    latitude,
    longitude,
    radius: searchRadius,
    categories,
    home_categories,
    q,
    page: normalizedPage,
    pageSize: normalizedPageSize
  });

  const cached = await cacheService.get(cacheKey);
  const favoriteMap = await favoriteMapPromise;
  if (cached) {
    return {
      ...cached,
      formatted: applyFavoritesToRestaurants(cached.formatted, favoriteMap),
      client_id: client_id || null
    };
  }

  const normalizedHomeCategoryIds = Array.isArray(home_categories)
    ? home_categories.map((id) => String(id).trim()).filter(Boolean)
    : (home_categories ? [String(home_categories).trim()].filter(Boolean) : []);

  const categorySlugs = normalizedCategoryFilter;
  const homeCategoryIds = [...new Set(normalizedHomeCategoryIds)];
  const queryText = typeof q === "string" && q.trim() ? q.trim() : null;
  const point = "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography";
  const sqlNearby = `
    SELECT
      r.id,
      r.is_premium,
      ST_Distance(r.location, ${point}) AS distance
    FROM restaurants r
    WHERE
      r.is_active = true
      AND r.status = 'approved'
      AND ST_DWithin(r.location, ${point}, :radius)
      AND (:q IS NULL OR r.name ILIKE '%' || :q || '%')
      AND (
        :hasCategorySlugFilter = false OR EXISTS (
          SELECT 1
          FROM restaurant_home_categories rhc
          JOIN home_categories hc ON hc.id = rhc.home_category_id
          WHERE rhc.restaurant_id = r.id
            AND hc.slug = ANY(ARRAY[:categorySlugs]::text[])
        )
      )
      AND (
        :hasHomeCategoryIdFilter = false OR EXISTS (
          SELECT 1
          FROM restaurant_home_categories rhc
          WHERE rhc.restaurant_id = r.id
            AND rhc.home_category_id = ANY(ARRAY[:homeCategoryIds]::uuid[])
        )
      )
    ORDER BY r.is_premium DESC, distance ASC
    LIMIT :limit OFFSET :offset
  `;

  const nearbyRows = await sequelize.query(sqlNearby, {
    type: QueryTypes.SELECT,
      replacements: {
        lat: latitude,
        lng: longitude,
        radius: searchRadius,
        q: queryText,
        hasCategorySlugFilter: categorySlugs.length > 0,
        hasHomeCategoryIdFilter: homeCategoryIds.length > 0,
        categorySlugs,
        homeCategoryIds,
        limit,
        offset
      }
  });

  const restaurantIds = nearbyRows.map((row) => row.id);

  if (restaurantIds.length === 0) {
    const emptyPayload = {
      formatted: [],
      count: 0,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      radius: searchRadius,
      center: { lat: latitude, lng: longitude },
      searchType: address ? "address" : "coordinates"
    };

    await cacheService.set(cacheKey, emptyPayload, NEARBY_CACHE_TTL);

    return {
      ...emptyPayload,
      formatted: [],
      client_id: client_id || null
    };
  }

  const restaurants = await Restaurant.findAll({
    where: { id: { [Op.in]: restaurantIds } },
    attributes: [
      "id",
      "name",
      "description",
      "address",
      "location",
      "rating",
      "image_url",
      "is_premium",
      "status",
      "opening_hours",
      "email",
      "phone_number"
    ],
    include: [
      {
        model: HomeCategory,
        as: "home_categories",
        attributes: ["id", "name", "slug", "description", "image_url", "display_order"],
        through: { attributes: [] },
        required: false
      }
    ]
  });

  const restaurantById = new Map(restaurants.map((restaurant) => [String(restaurant.id), restaurant]));

  const sqlSamples = `
    SELECT
      id,
      restaurant_id,
      nom,
      description,
      prix,
      photo_url,
      is_available,
      temps_preparation
    FROM (
      SELECT
        id,
        restaurant_id,
        nom,
        description,
        prix,
        photo_url,
        is_available,
        temps_preparation,
        row_number() OVER (PARTITION BY restaurant_id ORDER BY created_at DESC) AS rn
      FROM menu_items
      WHERE restaurant_id = ANY(ARRAY[:restaurantIds]::uuid[])
        AND is_available = true
    ) t
    WHERE rn <= 2
    ORDER BY restaurant_id, rn ASC
  `;

  const [sampleRows, ratingMap] = await Promise.all([
    sequelize.query(sqlSamples, {
      type: QueryTypes.SELECT,
      replacements: {
        restaurantIds
      }
    }),
    buildRestaurantRatingMap(restaurantIds)
  ]);

  const sampleByRestaurant = new Map();
  sampleRows.forEach((row) => {
    const rid = String(row.restaurant_id);
    const list = sampleByRestaurant.get(rid) || [];
    list.push(row);
    sampleByRestaurant.set(rid, list);
  });

  const configuredPreparationTime = await SystemConfig.get('default_preparation_time', 15);
  const parsedPreparationTime = Number.parseInt(String(configuredPreparationTime), 10);
  const prepTime = Number.isFinite(parsedPreparationTime)
    ? Math.min(120, Math.max(5, parsedPreparationTime))
    : 15;
  const formattedBase = nearbyRows
    .map((row) => {
      const restaurant = restaurantById.get(String(row.id));
      if (!restaurant) return null;

      const coords = restaurant.location?.coordinates || [];
      const distanceMeters = toDecimal(row.distance);
      const distanceKm = distanceMeters / 1000;
      const speedKmh = 40;
      const deliveryTimeMinutes = (distanceKm / speedKmh) * 60;
      const deliveryTimeMin = Math.floor(deliveryTimeMinutes * 0.9);
      const deliveryTimeMax = Math.ceil(deliveryTimeMinutes * 1.2);

      const samples = sampleByRestaurant.get(String(restaurant.id)) || [];
      const sampleDishes = samples.map((item) => ({
        id: item.id,
        name: item.nom,
        description: item.description,
        price: item.prix ? parseFloat(item.prix) : null,
        image_url: item.photo_url,
        is_available: item.is_available,
        prep_time_minutes: item.temps_preparation
      }));

      const homeCategories = serializeHomeCategories(restaurant.home_categories);
      const ratingStats = ratingMap.get(String(restaurant.id)) || { rating_count: 0, raters_count: 0 };
      return {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        lat: coords[1] || null,
        lng: coords[0] || null,
        rating: restaurant.rating,
        rating_count: ratingStats.rating_count,
        raters_count: ratingStats.raters_count,
        delivery_time_min: prepTime + deliveryTimeMin,
        delivery_time_max: prepTime + deliveryTimeMax,
        image_url: restaurant.image_url,
        distance: distanceMeters,
        is_premium: restaurant.is_premium,
        status: restaurant.status,
        is_open: restaurant.isOpen(),
        home_categories: homeCategories,
        categories: extractHomeCategorySlugs(homeCategories),
        favorite_uuid: null,
        email: restaurant.email || null,
        menu_items: sampleDishes
      };
    })
    .filter(Boolean);

  const cachePayload = {
    formatted: formattedBase,
    count: formattedBase.length,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    radius: searchRadius,
    center: { lat: latitude, lng: longitude },
    searchType: address ? "address" : "coordinates"
  };

  await cacheService.set(cacheKey, cachePayload, NEARBY_CACHE_TTL);

  return {
    ...cachePayload,
    formatted: applyFavoritesToRestaurants(formattedBase, favoriteMap),
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

  const normalizedCategoryFilter = normalizeCategoryList(
    Array.isArray(categories) ? categories : (categories ? [categories] : [])
  );

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

  const categoryInclude = {
    model: HomeCategory,
    as: "home_categories",
    attributes: ["id", "name", "slug", "description", "image_url", "display_order"],
    required: normalizedCategoryFilter.length > 0
  };

  if (normalizedCategoryFilter.length > 0) {
    categoryInclude.where = {
      slug: {
        [Op.in]: normalizedCategoryFilter
      }
    };
  }

  // Main query
  const { rows, count } = await Restaurant.findAndCountAll({
    where: whereClause,
    include: [categoryInclude],
    distinct: true,
    order,
    limit,
    offset
  });

  // ✅ IMPORTANT: Sauvegarder le count AVANT filtrage is_open
  const totalCount = count;
  const ratingMap = await buildRestaurantRatingMap(rows.map((restaurant) => restaurant.id));

  // Format response
  let formatted = rows.map((r) => {
    const coords = r.location?.coordinates || [];
    const homeCategories = serializeHomeCategories(r.home_categories);
    const ratingStats = ratingMap.get(String(r.id)) || { rating_count: 0, raters_count: 0 };

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      address: r.address,
      lat: coords[1] ?? null,
      lng: coords[0] ?? null,
      rating: r.rating,
      rating_count: ratingStats.rating_count,
      raters_count: ratingStats.raters_count,
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
      home_categories: homeCategories,
      categories: extractHomeCategorySlugs(homeCategories),
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
  const { address, lat, lng, radius } = filters;

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

  const searchRadius = await resolveClientRestaurantSearchRadius(radius);

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
    ...(email !== undefined && { email })
  });

  if (categories !== undefined) {
    await syncRestaurantHomeCategories(resto, categories);
  }

  await resto.reload({
    include: [{
      model: HomeCategory,
      as: "home_categories",
      attributes: ["id", "name", "slug", "description", "image_url", "display_order"]
    }]
  });

  const restaurantPlain = resto.get({ plain: true });
  const homeCategories = serializeHomeCategories(resto.home_categories);
  restaurantPlain.home_categories = homeCategories;
  restaurantPlain.categories = extractHomeCategorySlugs(homeCategories);

  return restaurantPlain;
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

export const getCategoriesWithMenuItems = async (restaurantId, clientId = null, options = {}) => {
  // Verify restaurant exists
  const restaurant = await Restaurant.findByPk(restaurantId, {
    include: [{
      model: HomeCategory,
      as: "home_categories",
      attributes: ["id", "name", "slug", "description", "image_url", "display_order"]
    }]
  });
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  const restaurantPlain = restaurant.get({ plain: true });
  const homeCategories = serializeHomeCategories(restaurant.home_categories);
  restaurantPlain.home_categories = homeCategories;
  restaurantPlain.categories = extractHomeCategorySlugs(homeCategories);
  const coordinates = restaurant.getCoordinates();
  if (coordinates) {
    restaurantPlain.coordinates = coordinates;
  }

  const includeUnavailable = options.includeUnavailable ?? false;
  const menuItemInclude = {
    model: MenuItem,
    as: 'items', // association alias
    required: false,
    attributes: [
      'id',
      'nom',
      'description',
      'prix',
      'photo_url',
      'temps_preparation',
      'is_available'
    ],
    include: [{
      model: Addition,
      as: 'additions',
      attributes: [
        'id',
        'nom',
        'description',
        'prix',
        'is_available'
      ]
    }]
  };
  if (!includeUnavailable) {
    menuItemInclude.where = { is_available: true };
  }

  const [categories, promotions] = await Promise.all([
    FoodCategory.findAll({
      where: { restaurant_id: restaurantId },
      include: [menuItemInclude],
      order: [
        ['ordre_affichage', 'ASC'],
        ['created_at', 'DESC'],
        [{ model: MenuItem, as: 'items' }, 'nom', 'ASC']
      ]
    }),
    listPromotions({
      restaurant_id: restaurantId,
      is_active: true,
      active_on: new Date()
    })
  ]);

  const formattedPromotions = promotions.map((promo) => {
    const plain = typeof promo.get === "function" ? promo.get({ plain: true }) : promo;
    return plain;
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
      ? category.items.map(item => {
          const basePrice = roundMoney(toDecimal(item.prix));
          const itemPromotions = getApplicableItemPromotions(formattedPromotions, item, restaurantId);
          const promoPrices = itemPromotions
            .map(promo => (typeof promo.new_price === "number" ? promo.new_price : basePrice))
            .filter(Number.isFinite);
          const displayPrice = promoPrices.length ? Math.min(basePrice, ...promoPrices) : basePrice;

          return {
            id: item.id,
            nom: item.nom,
            description: item.description,
            prix: basePrice,
            display_price: displayPrice,
            is_on_promotion: itemPromotions.length > 0,
            promotion_highlight: itemPromotions[0]?.badge_text || null,
            photo_url: item.photo_url,
            temps_preparation: item.temps_preparation,
            is_available: item.is_available,
            is_favorite: favoritesMap.has(item.id),
            favorite_id: favoritesMap.get(item.id) || null,
            additions: (item.additions || []).map(addition => ({
              id: addition.id,
              nom: addition.nom,
              description: addition.description,
              prix: parseFloat(addition.prix),
              is_available: addition.is_available
            })),
            additions_count: item.additions ? item.additions.length : 0,
            promotions: itemPromotions
          };
        })
      : [],
    items_count: category.items ? category.items.length : 0
  }));

  const buyXGetYItems = new Map();
  formattedCategories.forEach((category) => {
    (category.items || []).forEach((item) => {
      const hasBuyXGetY = Array.isArray(item.promotions)
        && item.promotions.some((promo) => promo.type === "buy_x_get_y");
      if (hasBuyXGetY) {
        buyXGetYItems.set(String(item.id), item);
      }
    });
  });

  const promotionCategories = [];
  if (buyXGetYItems.size > 0) {
    const promoItems = Array.from(buyXGetYItems.values());
    promotionCategories.push({
      id: `promo-buyxgety-${restaurantId}`,
      nom: "1 achete = 1 offert",
      description: "Plats avec offre acheter X obtenir Y",
      icone_url: null,
      ordre_affichage: -1,
      is_promotion_category: true,
      promotion_type: "buy_x_get_y",
      items: promoItems,
      items_count: promoItems.length
    });
  }

  const categoriesWithPromotions = promotionCategories.length > 0
    ? [...promotionCategories, ...formattedCategories]
    : formattedCategories;

  return {
    restaurant_id: restaurantId,
    restaurant: restaurantPlain,
    categories: categoriesWithPromotions,
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
    where: { id },
    include: [{
      model: HomeCategory,
      as: "home_categories",
      attributes: ["id", "name", "slug", "description", "image_url", "display_order"]
    }]
  });

  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  const coords = restaurant.location?.coordinates || [];

  const homeCategories = serializeHomeCategories(restaurant.home_categories);

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
    home_categories: homeCategories,
    categories: extractHomeCategorySlugs(homeCategories),
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

  // ==================== SEARCH FILTER (avec nom du client) ====================
  if (search && search.trim()) {
    const searchTerm = search.trim();
    
    // Trouver les clients qui correspondent à la recherche
    const matchingClients = await Client.findAll({
      where: {
        [Op.or]: [
          { first_name: { [Op.iLike]: `%${searchTerm}%` } },
          { last_name: { [Op.iLike]: `%${searchTerm}%` } },
          // Recherche dans le nom complet (prénom + nom)
          literal(`LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER('%${searchTerm}%')`)
        ]
      },
      attributes: ['id'],
      raw: true
    });
    
    const clientIds = matchingClients.map(c => c.id);
    
    // Construire les conditions de recherche
    where[Op.or] = [
      { order_number: { [Op.iLike]: `%${searchTerm}%` } },
      { delivery_address: { [Op.iLike]: `%${searchTerm}%` } }
    ];
    
    // Ajouter la recherche par client si des clients correspondent
    if (clientIds.length > 0) {
      where[Op.or].push({ client_id: { [Op.in]: clientIds } });
    }
  }

  // ==================== QUERY WITH COMPLETE INCLUDES ====================
  const { count, rows } = await Order.findAndCountAll({
    where,
    distinct: true,
    include: [
      {
        model: Restaurant,
        as: 'restaurant',
        required: false,
        include: [{
          model: HomeCategory,
          as: 'home_categories',
          attributes: ["id", "name", "slug", "description", "image_url", "display_order"]
        }]
      },
      {
        model: Client,
        as: 'client',
        required: false
      },
      {
        model: Driver,
        as: 'driver',
        required: false
      },
      {
        model: OrderItem,
        as: 'order_items',
        required: false,
        include: [
          {
            model: MenuItem,
            as: 'menu_item',
            required: false
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

  // ==================== FORMAT RESPONSE ====================
  const formattedOrders = rows.map(order => {
    const restaurantCoords = order.restaurant?.location?.coordinates || [];
    const deliveryCoords = order.delivery_location?.coordinates || [];
    const restaurantHomeCategories = order.restaurant
      ? serializeHomeCategories(order.restaurant.home_categories)
      : [];

    return {
      id: order.id,
      order_number: order.order_number,
      client_id: order.client_id,
      restaurant_id: order.restaurant_id,
      order_type: order.order_type,
      status: order.status,
      livreur_id: order.livreur_id,
      
      subtotal: parseFloat(order.subtotal || 0),
      delivery_fee: parseFloat(order.delivery_fee || 0),
      total_amount: parseFloat(order.total_amount || 0),
      delivery_distance: order.delivery_distance ? parseFloat(order.delivery_distance) : null,
      
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
      
      estimated_delivery_time: order.estimated_delivery_time,
      created_at: order.created_at,
      updated_at: order.updated_at,
      accepted_at: order.accepted_at,
      preparing_started_at: order.preparing_started_at,
      assigned_at: order.assigned_at,
      delivering_started_at: order.delivering_started_at,
      delivered_at: order.delivered_at,
      
      rating: order.rating ? parseFloat(order.rating) : null,
      restaurant_review_comment: order.restaurant_review_comment,
      driver_review_comment: order.driver_review_comment,
      review_comment: order.restaurant_review_comment ?? order.driver_review_comment ?? null,
      decline_reason: order.decline_reason,
      
      restaurant: order.restaurant ? {
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
        home_categories: restaurantHomeCategories,
        categories: extractHomeCategorySlugs(restaurantHomeCategories),
        created_at: order.restaurant.created_at,
        updated_at: order.restaurant.updated_at
      } : null,

      client: order.client ? {
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
        full_name: `${order.client.first_name} ${order.client.last_name}`
      } : null,

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
        full_name: `${order.driver.first_name} ${order.driver.last_name}`
      } : null,

      order_items: order.order_items?.map(item => ({
        id: item.id,
        order_id: item.order_id,
        menu_item_id: item.menu_item_id,
        quantite: item.quantite,
        prix_unitaire: parseFloat(item.prix_unitaire),
        prix_total: parseFloat(item.prix_total),
        instructions_speciales: item.instructions_speciales,
        created_at: item.created_at,
        updated_at: item.updated_at,
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
                description: add.addition.description,
                prix: parseFloat(add.addition.prix),
                is_available: add.addition.is_available,
                menu_item_id: add.addition.menu_item_id
              }
            : null
        })),
        menu_item: item.menu_item ? {
          id: item.menu_item.id,
          category_id: item.menu_item.category_id,
          nom: item.menu_item.nom,
          description: item.menu_item.description,
          prix: parseFloat(item.menu_item.prix),
          photo_url: item.menu_item.photo_url,
          is_available: item.menu_item.is_available,
          temps_preparation: item.menu_item.temps_preparation,
          primary_promotions: item.menu_item.primary_promotions || [],
          promotions: item.menu_item.promotions || [],
          created_at: item.menu_item.created_at,
          updated_at: item.menu_item.updated_at
        } : null
      })) || []
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
