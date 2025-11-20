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



const router = express.Router();

// Toutes les routes admin nécessitent authentification + rôle admin
router.use(protect, authorize('admin'));

// Profil
router.get('/profile/me', adminCtrl.getProfile);

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

// Update admin
router.put('/update/:id', protect, authorize('admin'), adminCtrl.updateAdmin);

// Delete admin
router.delete('/delete/:id', protect, authorize('admin'), adminCtrl.deleteAdmin);

// Add this route
router.post('/create', protect, authorize('admin'), adminCtrl.createAdmin);

// Dans src/routes/admin.routes.js

// Get all favorite restaurants (admin view)
router.get('/favorites/restaurants', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { client_id, search, page = 1, limit = 20 } = req.query;
    
    const token = req.headers.authorization;
    const where = client_id ? { client_id } : {};
    
    const FavoriteRestaurant = (await import('../models/FavoriteRestaurant.js')).default;
    const Restaurant = (await import('../models/Restaurant.js')).default;
    const Client = (await import('../models/Client.js')).default;
    
    const favorites = await FavoriteRestaurant.findAll({
      where,
      include: [
        { 
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['id', 'name', 'description', 'address', 'rating', 'image_url', 'is_premium', 'status']
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone_number']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (err) {
    next(err);
  }
});

// Get all favorite meals (admin view)
router.get('/favorites/meals', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { client_id, search, page = 1, limit = 20 } = req.query;
    
    const where = client_id ? { client_id } : {};
    
    const FavoriteMeal = (await import('../models/FavoriteMeal.js')).default;
    const MenuItem = (await import('../models/MenuItem.js')).default;
    const Restaurant = (await import('../models/Restaurant.js')).default;
    const Client = (await import('../models/Client.js')).default;
    
    const favorites = await FavoriteMeal.findAll({
      where,
      include: [
        { 
          model: MenuItem, 
          as: 'meal',
          attributes: ['id', 'nom', 'description', 'prix', 'photo_url', 'category_id'],
          include: [
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name', 'address', 'rating', 'image_url']
            }
          ]
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone_number']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (err) {
    next(err);
  }
});

// Get favorites statistics
router.get('/favorites/stats', protect, authorize('admin'), async (req, res, next) => {
  try {
    const FavoriteRestaurant = (await import('../models/FavoriteRestaurant.js')).default;
    const FavoriteMeal = (await import('../models/FavoriteMeal.js')).default;
    
    const [restaurantCount, mealCount] = await Promise.all([
      FavoriteRestaurant.count(),
      FavoriteMeal.count()
    ]);
    
    res.json({
      success: true,
      data: {
        total_favorite_restaurants: restaurantCount,
        total_favorite_meals: mealCount,
        total_favorites: restaurantCount + mealCount
      }
    });
  } catch (err) {
    next(err);
  }
});
export default router;