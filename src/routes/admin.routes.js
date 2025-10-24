import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as adminCtrl from '../controllers/admin.controller.js';

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

export default router;