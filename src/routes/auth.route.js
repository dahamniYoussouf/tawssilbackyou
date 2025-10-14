import express from 'express';
import { 
  register, 
  login, 
  getProfile,
  requestOTP,
  verifyOTP,
  refreshAccessToken,  
  logout            
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Request OTP (only when needed - first time or token expired)
router.post('/otp/request', requestOTP);

// Verify OTP and get long-lived tokens
router.post('/otp/verify', verifyOTP);

// Register new account
router.post('/register', register);

// Login with email/password
router.post('/login', login);

// Refresh access token (called automatically by frontend)
router.post('/refresh', refreshAccessToken);

// Logout (revoke refresh token)
router.post('/logout', logout);

// Get current user profile (protected route)
router.get('/profile', protect, getProfile);

export default router;