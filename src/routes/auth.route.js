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

/**
 * Request an OTP for passwordless login.
 * Sends an OTP to the user's phone number.
 */
router.post('/otp/request', requestOTP);

/**
 * Verify the OTP and log the user in.
 * Returns access and refresh tokens on success.
 */
router.post('/otp/verify', verifyOTP);

/**
 * Register a new user account.
 * Can be used for drivers or restaurants.
 */
router.post('/register', register);

/**
 * Log in using email and password.
 * Returns access and refresh tokens for authenticated users.
 */
router.post('/login', login);

/**
 * Refresh the access token using a valid refresh token.
 */
router.post('/refresh', refreshAccessToken);

/**
 * Log out and revoke the refresh token.
 * Effectively ends the session on the device.
 */
router.post('/logout', logout);

/**
 * Retrieve the current authenticated user's profile.
 * Requires a valid bearer token.
 */
router.get('/profile', protect, getProfile);

export default router;
