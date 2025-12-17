import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import { 
  getDeliveryConfig, 
  updateMaxOrders, 
  updateMaxDistance 
} from '../controllers/admin.controller.js';
import { 
  updateMaxOrdersValidator, 
  updateMaxDistanceValidator 
} from '../validators/configValidator.js';
import { validate } from '../middlewares/validate.js';
import { notifyAllDrivers } from '../controllers/admin.controller.js';
import * as homeCategoryCtrl from '../controllers/homeCategory.controller.js';
import * as thematicSelectionCtrl from '../controllers/thematicSelection.controller.js';
import * as promotionCtrl from '../controllers/promotion.controller.js';
import * as dailyDealCtrl from '../controllers/dailyDeal.controller.js';
import * as recommendedDishCtrl from '../controllers/recommendedDish.controller.js';
import {
  createHomeCategoryValidator,
  deleteHomeCategoryValidator,
  updateHomeCategoryValidator
} from '../validators/homeCategoryValidator.js';
import {
  createThematicSelectionValidator,
  deleteThematicSelectionValidator,
  updateThematicSelectionValidator
} from '../validators/thematicSelectionValidator.js';
import {
  createPromotionValidator,
  deletePromotionValidator,
  updatePromotionValidator
} from '../validators/promotionValidator.js';
import {
  createDailyDealValidator,
  deleteDailyDealValidator,
  updateDailyDealValidator
} from '../validators/dailyDealValidator.js';
import {
  createRecommendedDishValidator,
  deleteRecommendedDishValidator,
  updateRecommendedDishValidator
} from '../validators/recommendedDishValidator.js';



const router = express.Router();

// Toutes les routes admin nécessitent authentification + rôle admin
router.use(protect, authorize('admin'));

// Profil
router.get('/profile/me', adminCtrl.getProfile);
router.put('/profile/me', adminCtrl.updateProfile);

// Notifications
router.get('/notifications', adminCtrl.getNotifications);
router.patch('/notifications/:id/read', adminCtrl.markAsRead);
router.post('/notifications/:id/resolve', adminCtrl.resolveNotification);

// Actions sur les commandes
router.post('/orders/:id/force-accept', adminCtrl.forceAcceptOrder);
router.post('/orders/:id/force-cancel', adminCtrl.forceCancelOrder);
router.get('/drivers/:id/cancellations', adminCtrl.getDriverCancellations);
router.post('/drivers/:id/reset-cancellations', adminCtrl.resetDriverCancellations);
router.post('/drivers/:id/suspend', adminCtrl.suspendDriver);

// Configuration de livraison
router.get('/config/delivery', getDeliveryConfig);
router.put('/config/delivery/max-orders', updateMaxOrdersValidator, validate, updateMaxOrders);
router.put('/config/delivery/max-distance', updateMaxDistanceValidator, validate, updateMaxDistance);

// Add these routes to src/routes/admin.routes.js

// Get all admins (super_admin only)
router.get('/getall', protect, authorize('admin'), adminCtrl.getAllAdmins);
router.put('/update/:id', protect, authorize('admin'), adminCtrl.updateAdmin);
router.delete('/delete/:id', protect, authorize('admin'), adminCtrl.deleteAdmin);
router.post('/create', protect, authorize('admin'), adminCtrl.createAdmin);

// Dans src/routes/admin.routes.js

// ==================== FAVORIS ====================
router.get('/favorites/restaurants', adminCtrl.getAllFavoriteRestaurants);
router.get('/favorites/meals', adminCtrl.getAllFavoriteMeals);
router.get('/favorites/stats', adminCtrl.getFavoritesStats);

// ==================== STATISTICS ====================
router.get('/statistics', adminCtrl.getStatistics);
router.get('/monitoring', adminCtrl.getMonitoringSnapshot);

// ==================== CONFIGURATIONS ====================
router.get('/config/all', adminCtrl.getAllConfigs);
router.put('/config/:key', adminCtrl.updateConfig);

// ==================== TOP RATED ====================
router.get('/top/meals', adminCtrl.getTop10Meals);
router.get('/top/restaurants', adminCtrl.getTop10Restaurants);
router.get('/top/drivers', adminCtrl.getTop10Drivers);

// ==================== MAP DATA ====================
router.get('/map/restaurants', adminCtrl.getMapRestaurants);
router.get('/map/drivers', adminCtrl.getMapDrivers);

router.post('/notify/drivers', protect, authorize('admin'), notifyAllDrivers);

// ==================== CACHE MANAGEMENT ====================
router.get('/cache/stats', adminCtrl.getCacheStats);
router.post('/cache/clear', adminCtrl.clearCache);
router.post('/cache/invalidate/:pattern', adminCtrl.invalidateCachePattern);

// ==================== HOMEPAGE CATEGORIES ====================
router.get('/homepage/categories', homeCategoryCtrl.getCategories);
router.get('/homepage/overview', adminCtrl.getHomepageSnapshot);
router.post(
  '/homepage/categories',
  createHomeCategoryValidator,
  validate,
  homeCategoryCtrl.createCategory
);
router.put(
  '/homepage/categories/:id',
  updateHomeCategoryValidator,
  validate,
  homeCategoryCtrl.updateCategory
);
router.delete(
  '/homepage/categories/:id',
  deleteHomeCategoryValidator,
  validate,
  homeCategoryCtrl.removeCategory
);

// ==================== HOMEPAGE THEMATIC SELECTIONS ====================
router.get('/homepage/thematic-selections', thematicSelectionCtrl.getSelections);
router.post(
  '/homepage/thematic-selections',
  createThematicSelectionValidator,
  validate,
  thematicSelectionCtrl.createSelection
);
router.put(
  '/homepage/thematic-selections/:id',
  updateThematicSelectionValidator,
  validate,
  thematicSelectionCtrl.updateSelection
);
router.delete(
  '/homepage/thematic-selections/:id',
  deleteThematicSelectionValidator,
  validate,
  thematicSelectionCtrl.removeSelection
);

// ==================== HOMEPAGE RECOMMENDED DISHES ====================
router.get('/homepage/recommended-dishes', recommendedDishCtrl.getRecommendedDishes);
router.post(
  '/homepage/recommended-dishes',
  createRecommendedDishValidator,
  validate,
  recommendedDishCtrl.create
);
router.put(
  '/homepage/recommended-dishes/:id',
  updateRecommendedDishValidator,
  validate,
  recommendedDishCtrl.update
);
router.delete(
  '/homepage/recommended-dishes/:id',
  deleteRecommendedDishValidator,
  validate,
  recommendedDishCtrl.remove
);

// ==================== HOMEPAGE DAILY DEALS ====================
router.get('/homepage/daily-deals', dailyDealCtrl.getDailyDeals);
router.post(
  '/homepage/daily-deals',
  createDailyDealValidator,
  validate,
  dailyDealCtrl.create
);
router.put(
  '/homepage/daily-deals/:id',
  updateDailyDealValidator,
  validate,
  dailyDealCtrl.update
);
router.delete(
  '/homepage/daily-deals/:id',
  deleteDailyDealValidator,
  validate,
  dailyDealCtrl.remove
);

// ==================== PROMOTIONS ====================
router.get('/promotions', promotionCtrl.getPromotions);
router.post(
  '/promotions',
  createPromotionValidator,
  validate,
  promotionCtrl.create
);
router.put(
  '/promotions/:id',
  updatePromotionValidator,
  validate,
  promotionCtrl.update
);
router.delete(
  '/promotions/:id',
  deletePromotionValidator,
  validate,
  promotionCtrl.remove
);

export default router;
