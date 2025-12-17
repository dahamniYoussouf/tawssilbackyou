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
import cacheService from "./cache.service.js";

const HOMEPAGE_MODULES_CACHE_KEY = "homepage:modules:v1";
const HOMEPAGE_MODULES_CACHE_TTL = 60; // seconds

export const getHomepageModules = async () => {
  const cached = await cacheService.get(HOMEPAGE_MODULES_CACHE_KEY);
  if (cached !== null) {
    return cached;
  }

  const now = new Date().toISOString();
  const [
    homeCategories,
    thematicSelections,
    recommendedDishes,
    dailyDeals,
    promotions,
    announcements
  ] = await Promise.all([
    listHomeCategories({ activeOnly: true }),
    listThematicSelections({ activeOnly: true }),
    listRecommendedDishes({ activeOnly: true }),
    listDailyDeals({ activeOnly: true }),
    listPromotions({
      is_active: true,
      active_on: now
    }),
    getActiveAnnouncements()
  ]);

  const modules = {
    homeCategories,
    thematicSelections,
    recommendedDishes,
    dailyDeals,
    promotions,
    announcements
  };

  await cacheService.set(HOMEPAGE_MODULES_CACHE_KEY, modules, HOMEPAGE_MODULES_CACHE_TTL);

  return modules;
};

export const clearHomepageModulesCache = () => {
  return cacheService.del(HOMEPAGE_MODULES_CACHE_KEY);
};
