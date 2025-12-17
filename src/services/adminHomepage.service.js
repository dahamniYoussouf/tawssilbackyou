import { getHomepageModules } from "./homepage.service.js";
import {
  getAllRestaurants,
  filterNearbyRestaurants
} from "./restaurant.service.js";
import { getAllMenuItems } from "./menuItem.service.js";

const DEFAULT_LOCATION = { lat: 36.75, lng: 3.05 };

export const getAdminHomepageSnapshot = async ({
  menuItemLimit = 200,
  nearbyFilters = {}
} = {}) => {
  const computedNearby = {
    ...nearbyFilters,
    lat: Number.isFinite(nearbyFilters.lat) ? nearbyFilters.lat : DEFAULT_LOCATION.lat,
    lng: Number.isFinite(nearbyFilters.lng) ? nearbyFilters.lng : DEFAULT_LOCATION.lng,
    radius: nearbyFilters.radius || 5000,
    page: nearbyFilters.page || 1,
    pageSize: nearbyFilters.pageSize || 20,
    client_id: null
  };

  const [modules, restaurants, menuItemsResult, nearbyResult] = await Promise.all([
    getHomepageModules(),
    getAllRestaurants(),
    getAllMenuItems({ page: 1, limit: menuItemLimit }),
    filterNearbyRestaurants(computedNearby)
  ]);

  return {
    ...modules,
    restaurants,
    menuItems: menuItemsResult.items,
    menuItems_pagination: menuItemsResult.pagination,
    nearby: nearbyResult
  };
};
