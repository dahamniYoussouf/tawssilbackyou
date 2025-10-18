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
 * POST /auth/otp/request
 * @tags Authentication
 * @summary Request OTP for client login
 * @description Send OTP code to client's phone number for passwordless authentication
 * @param {object} request.body.required - Phone number
 * @example request - Request body example
 * {
 *   "phone_number": "+213555123456"
 * }
 * @return {object} 200 - OTP sent successfully
 * @example response - 200 - Success response
 * {
 *   "message": "OTP envoyé avec succès",
 *   "phone_number": "+213555123456",
 *   "is_new_user": false,
 *   "dev_otp": "123456"
 * }
 * @return {object} 400 - Bad request
 * @return {object} 500 - Server error
 */
router.post('/otp/request', requestOTP);

/**
 * POST /auth/otp/verify
 * @tags Authentication
 * @summary Verify OTP and login
 * @description Verify OTP code and receive long-lived access and refresh tokens
 * @param {object} request.body.required - OTP verification data
 * @example request - Request body example
 * {
 *   "phone_number": "+213555123456",
 *   "otp": "123456",
 *   "device_id": "device-abc-123"
 * }
 * @return {object} 200 - Login successful
 * @example response - 200 - Success response
 * {
 *   "message": "Connexion réussie",
 *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "expires_in": 900,
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@temp.local",
 *     "role": "client"
 *   },
 *   "profile": {
 *     "id": "uuid",
 *     "first_name": "John",
 *     "last_name": "Doe"
 *   }
 * }
 * @return {object} 400 - Invalid OTP or expired
 * @return {object} 500 - Server error
 */
router.post('/otp/verify', verifyOTP);

/**
 * POST /auth/register
 * @tags Authentication
 * @summary Register new driver or restaurant account
 * @description Create a new account for driver or restaurant with email/password
 * @param {object} request.body.required - Registration data
 * @example request - Driver registration
 * {
 *   "email": "driver@example.com",
 *   "password": "SecurePass123!",
 *   "role": "driver",
 *   "first_name": "John",
 *   "last_name": "Doe",
 *   "phone": "+213555123456",
 *   "vehicle_type": "motorcycle",
 *   "vehicle_plate": "ABC-123-DZ"
 * }
 * @example request - Restaurant registration
 * {
 *   "email": "restaurant@example.com",
 *   "password": "SecurePass123!",
 *   "role": "restaurant",
 *   "name": "Pizza Palace",
 *   "address": "123 Main Street, Oran",
 *   "lat": 35.6976,
 *   "lng": -0.6337,
 *   "categories": ["pizza", "burger"]
 * }
 * @return {object} 201 - Registration successful
 * @example response - 201 - Success response
 * {
 *   "message": "Registration successful",
 *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "expires_in": 900,
 *   "user": {
 *     "id": "uuid",
 *     "email": "driver@example.com",
 *     "role": "driver"
 *   },
 *   "profile": {}
 * }
 * @return {object} 400 - Validation error
 * @return {object} 500 - Server error
 */
router.post('/register', register);

/**
 * POST /auth/login
 * @tags Authentication
 * @summary Login with email and password
 * @description Authenticate driver or restaurant with credentials
 * @param {object} request.body.required - Login credentials
 * @example request - Request body example
 * {
 *   "email": "driver@example.com",
 *   "password": "SecurePass123!",
 *   "device_id": "device-abc-123"
 * }
 * @return {object} 200 - Login successful
 * @example response - 200 - Success response
 * {
 *   "message": "Login successful",
 *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "expires_in": 900,
 *   "user": {
 *     "id": "uuid",
 *     "email": "driver@example.com",
 *     "role": "driver"
 *   },
 *   "profile": {
 *     "id": "uuid",
 *     "driver_code": "DRV-0001"
 *   }
 * }
 * @return {object} 401 - Invalid credentials
 * @return {object} 403 - Account deactivated
 * @return {object} 500 - Server error
 */
router.post('/login', login);

/**
 * POST /auth/refresh
 * @tags Authentication
 * @summary Refresh access token
 * @description Get new access token using refresh token (called automatically by frontend)
 * @param {object} request.body.required - Refresh token
 * @example request - Request body example
 * {
 *   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * @return {object} 200 - Token refreshed successfully
 * @example response - 200 - Success response
 * {
 *   "message": "Token rafraîchi",
 *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "expires_in": 900
 * }
 * @return {object} 401 - Invalid or expired refresh token
 * @return {object} 500 - Server error
 */
router.post('/refresh', refreshAccessToken);

/**
 * POST /auth/logout
 * @tags Authentication
 * @summary Logout and revoke refresh token
 * @description Revoke refresh token to logout user from device
 * @param {object} request.body.required - Refresh token to revoke
 * @example request - Request body example
 * {
 *   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * @return {object} 200 - Logout successful
 * @example response - 200 - Success response
 * {
 *   "message": "Déconnexion réussie"
 * }
 * @return {object} 500 - Server error
 */
router.post('/logout', logout);

/**
 * GET /auth/profile
 * @tags Authentication
 * @summary Get current user profile
 * @description Get authenticated user's profile information
 * @security bearerAuth
 * @return {object} 200 - Profile retrieved successfully
 * @example response - 200 - Success response
 * {
 *   "user": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "role": "driver",
 *     "is_active": true,
 *     "last_login": "2024-01-18T10:30:00Z"
 *   },
 *   "profile": {
 *     "id": "uuid",
 *     "first_name": "John",
 *     "last_name": "Doe",
 *     "driver_code": "DRV-0001"
 *   }
 * }
 * @return {object} 401 - Unauthorized
 * @return {object} 404 - User not found
 * @return {object} 500 - Server error
 */
router.get('/profile', protect, getProfile);

export default router;