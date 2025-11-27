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
export default router;