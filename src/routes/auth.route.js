import express from 'express';
import { 
  register, 
  login, 
  getProfile,
  requestOTP,
  verifyOTP
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Routes OTP pour clients
router.post('/otp/request', requestOTP);
router.post('/otp/verify', verifyOTP);

// Routes traditionnelles pour driver et restaurant
router.post('/register', register);
router.post('/login', login);

// Route protégée
router.get('/profile', protect, getProfile);

export default router;