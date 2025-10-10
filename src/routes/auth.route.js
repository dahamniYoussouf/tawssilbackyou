import express from 'express';
import { register, login, getProfile } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticate, getProfile);

// Role-specific routes (examples)
router.get('/client/profile', authenticate, authorize('client'), getProfile);
router.get('/driver/profile', authenticate, authorize('driver'), getProfile);
router.get('/restaurant/profile', authenticate, authorize('restaurant'), getProfile);

export default router;