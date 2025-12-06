import express from 'express';
import { 
  register, 
  login, 
  getProfile,
  requestOTP,
  verifyOTP,
  refreshAccessToken,  
  logout, 
      registerCashier        
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  requestOTPValidator,
  verifyOTPValidator,
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  logoutValidator
} from '../validators/authValidator.js';

const router = express.Router();

/**
 * Request an OTP for passwordless login.
 * Sends an OTP to the user's phone number.
 */
router.post('/otp/request', requestOTPValidator, validate, requestOTP);

/**
 * Verify the OTP and log the user in.
 * Returns access and refresh tokens on success.
 */
router.post('/otp/verify', verifyOTPValidator, validate, verifyOTP);

/**
 * Register a new user account.
 * Can be used for drivers or restaurants.
 */
router.post('/register', registerValidator, validate, register);

/**
 * Log in using email and password.
 * Returns access and refresh tokens for authenticated users.
 */
router.post('/login', loginValidator, validate, login);

/**
 * Refresh the access token using a valid refresh token.
 */
router.post('/refresh', refreshTokenValidator, validate, refreshAccessToken);

/**
 * Log out and revoke the refresh token.
 * Effectively ends the session on the device.
 */
router.post('/logout', logoutValidator, validate, logout);

/**
 * Retrieve the current authenticated user's profile.
 * Requires a valid bearer token.
 */
router.get('/profile', protect, getProfile);

/**
 * Register a new cashier account.
 * Can only be done by admins or restaurant owners.
 */
router.post(
  '/register/cashier', 
  protect, 
  registerCashier
);

export default router;