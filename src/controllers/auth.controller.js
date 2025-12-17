import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Driver from '../models/Driver.js';
import Restaurant from '../models/Restaurant.js';
import Admin from '../models/Admin.js';
import Cashier from '../models/Cashier.js';
import { normalizeCategoryList } from '../utils/slug.js';
import { CASHIER_STATUS_VALUES } from "../validators/cashierValidator.js";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";
import * as favoriteAddressService from '../services/favoriteAddress.service.js';


// OTP Store (use Redis in production)
const otpStore = new Map();

// Device tokens for "remember me" functionality
const deviceTokens = new Map(); // Store refresh tokens per device

// ============================================
// TOKEN GENERATION (Updated)
// ============================================

// Generate SHORT-LIVED access token (15 minutes)
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role, type: 'access' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1d' } // Short-lived for security
  );
};

// Generate LONG-LIVED refresh token (30 days)
const generateRefreshToken = (userId, role, deviceId) => {
  return jwt.sign(
    { id: userId, role, type: 'refresh', deviceId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: '30d' } // Long-lived for convenience
  );
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS
const sendOTP = async (phoneOrEmail, otp) => {
  console.log(`📱 OTP sent to ${phoneOrEmail}: ${otp}`);
  // TODO: Integrate real SMS service
  return true;
};

// ============================================
// CLIENT AUTHENTICATION FLOW
// ============================================

// STEP 1: Request OTP (First time or when token expired)

export const requestOTP = async (req, res) => {
  try {
    let { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Normaliser le numéro de téléphone
    phone_number = normalizePhoneNumber(phone_number);
    if (!phone_number) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Check if client exists
    let client = await Client.findOne({ where: { phone_number } });
    let isNewUser = false;

    // Create new client if doesn't exist
    if (!client) {
      const tempEmail = `${phone_number}@temp.local`;
      
      // ✅ Use findOrCreate to avoid duplicates
      const [user, userCreated] = await User.findOrCreate({
        where: { email: tempEmail },
        defaults: {
          email: tempEmail,
          password: Math.random().toString(36),
          role: 'client'
        }
      });

      // ✅ Check if client exists for this user (use phone_number OR user_id)
      const [foundClient, clientCreated] = await Client.findOrCreate({
        where: { 
          phone_number: phone_number  // ✅ Search by phone_number instead of user_id
        },
        defaults: {
          user_id: user.id,
          email: tempEmail,
          phone_number,
          first_name: '',
          last_name: ''
        }
      });

      client = foundClient;
      isNewUser = clientCreated;

      if (isNewUser) {
        console.log(`✨ New client registered: ${phone_number}`);
      } else {
        console.log(`✅ Existing client found: ${phone_number}`);
      }
    }

    // Generate and store OTP
    const otp = generateOTP();
    otpStore.set(phone_number, {
      code: otp,
      clientId: client.id,
      userId: client.user_id,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send OTP
    await sendOTP(phone_number, otp);

    res.json({
      message: 'OTP sent successfully',
      phone_number,
      is_new_user: isNewUser,
      dev_otp: otp
    });

  } catch (error) {
    console.error('requestOTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
};

// STEP 2: Verify OTP and get LONG-LIVED tokens
export const verifyOTP = async (req, res) => {
  try {
    let { phone_number, otp, device_id } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    // Normaliser le numéro de téléphone
    phone_number = normalizePhoneNumber(phone_number);
    if (!phone_number) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const storedData = otpStore.get(phone_number);

    if (!storedData) {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(phone_number);
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (storedData.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    otpStore.delete(phone_number);

    const user = await User.findByPk(storedData.userId);
    const client = await Client.findByPk(storedData.clientId);

    user.last_login = new Date();
    await user.save();

    const deviceIdentifier = device_id || `device-${Date.now()}-${Math.random()}`;

    // ===== Generate tokens WITH client_id =====
    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        client_id: client.id,
        type: 'access'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        client_id: client.id,
        type: 'refresh',
        deviceId: deviceIdentifier
      },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '30d' }
    );

    deviceTokens.set(refreshToken, {
      userId: user.id,
      deviceId: deviceIdentifier,
      createdAt: Date.now()
    });

    const favoriteAddresses = client
      ? await favoriteAddressService.listFavoriteAddresses(client.id)
      : [];

    res.json({
      message: 'Login successful',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      profile: client,
      favorite_addresses: favoriteAddresses
    });

  } catch (error) {
    console.error('verifyOTP error:', error);
    res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
  }
};

// NEW: Refresh access token (called automatically by frontend)
export const refreshAccessToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refresh_token,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      );
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Check if token exists in store
    const tokenData = deviceTokens.get(refresh_token);
    if (!tokenData) {
      return res.status(401).json({ message: 'Refresh token revoked' });
    }

    // Load user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid user' });
    }

    // Generate new access token (refresh token stays the same)
    const newAccessToken = generateAccessToken(user.id, user.role);

    res.json({
      message: 'Token refreshed successfully',
      access_token: newAccessToken,
      expires_in: 900 // 15 minutes
    });

  } catch (error) {
    console.error('refreshAccessToken error:', error);
    res.status(500).json({ message: 'Failed to refresh token' });
  }
};

// NEW: Logout (revoke refresh token)
export const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      // Remove refresh token from store
      deviceTokens.delete(refresh_token);
      console.log('🔓 User logged out, token revoked');
    }

    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};

// ============================================
// DRIVER/RESTAURANT LOGIN (Unchanged)
// ============================================

export const register = async (req, res) => {
  try {
    const { email, password, type, ...profileData } = req.body;

    if (!['driver', 'restaurant'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid type. Must be driver or restaurant'
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Map type to role for User model
    const role = type;
    const user = await User.create({ email, password, role });

    let profile;
    switch (type) {
      case 'driver':
        profile = await Driver.create({
          user_id: user.id,
          email: email,
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: normalizePhoneNumber(profileData.phone) || '',
          driver_code: `DRV-${String(Date.now()).slice(-6)}`,
          vehicle_type: profileData.vehicle_type || 'motorcycle',
          vehicle_plate: profileData.vehicle_plate || null,
          license_number: profileData.license_number || null
        });
        break;

      case 'restaurant': {
        const { lat, lng } = profileData;
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        if (isNaN(latitude) || isNaN(longitude)) {
          throw new Error('Valid latitude and longitude are required');
        }

        const rawCategories = Array.isArray(profileData.categories)
          ? profileData.categories
          : profileData.categories
            ? [profileData.categories]
            : [];
        const categories = normalizeCategoryList(rawCategories);
        if (categories.length === 0) {
          throw new Error('At least one category is required');
        }

        const isActive =
          profileData.is_active === undefined
            ? true
            : typeof profileData.is_active === 'string'
            ? profileData.is_active === 'true'
            : profileData.is_active;

        const isPremium =
          profileData.is_premium === undefined
            ? false
            : typeof profileData.is_premium === 'string'
            ? profileData.is_premium === 'true'
            : profileData.is_premium;

        let rating = 0.0;
        if (profileData.rating !== undefined && profileData.rating !== null) {
          rating = parseFloat(profileData.rating);
          if (isNaN(rating) || rating < 0 || rating > 5) {
            throw new Error('Rating must be between 0 and 5');
          }
        }

        profile = await Restaurant.create({
          user_id: user.id,
          name: profileData.name || 'New Restaurant',
          description: profileData.description || null,
          address: profileData.address || null,
          phone_number: profileData.phone_number || profileData.phone || null,
          email: profileData.email || email || null,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          rating: rating,
          image_url: profileData.image_url || null,
          is_active: isActive,
          is_premium: isPremium,
          status: 'pending',
          opening_hours: profileData.opening_hours || null,
          categories: categories
        });
        break;
      }
    }

    // For driver/restaurant, also use refresh tokens
    const deviceId = req.body.device_id || `device-${Date.now()}`;
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role, deviceId);

    deviceTokens.set(refreshToken, {
      userId: user.id,
      deviceId: deviceId,
      createdAt: Date.now()
    });

    res.status(201).json({
      message: 'Registration successful',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      profile
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, type, device_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!type) {
      return res.status(400).json({ message: 'Type is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // ✅ Check if type matches user's role
    if (user.role !== type) {
      return res.status(401).json({ 
        message: `Invalid credentials. This account is registered as ${user.role}` 
      });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // ✅ Load the profile
    let profile;
    let driver_id = null;
    let restaurant_id = null;
    let admin_id = null;
    let cashier_id = null; // ✅ NEW

    switch (user.role) {
      case 'driver':
        profile = await Driver.findOne({ where: { user_id: user.id } });
        driver_id = profile?.id || null;
        break;

      case 'restaurant':
        profile = await Restaurant.findOne({ where: { user_id: user.id } });
        restaurant_id = profile?.id || null;
        break;

      case 'admin':
        profile = await Admin.findOne({ where: { user_id: user.id } });
        admin_id = profile?.id || null;
        break;

      case 'cashier': // ✅ NEW
        profile = await Cashier.findOne({ 
          where: { user_id: user.id },
          include: [{
            model: Restaurant,
            as: 'restaurant',
            attributes: ['id', 'name']
          }]
        });
        cashier_id = profile?.id || null;
        restaurant_id = profile?.restaurant_id || null; // ✅ Cashier has access to restaurant
        break;
    }

    user.last_login = new Date();
    await user.save();

    // ✅ Generate tokens with cashier_id
    const deviceIdentifier = device_id || `device-${Date.now()}`;

    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        driver_id,
        restaurant_id,
        admin_id,
        cashier_id, // ✅ NEW
        type: 'access'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        driver_id,
        restaurant_id,
        admin_id,
        cashier_id, // ✅ NEW
        type: 'refresh',
        deviceId: deviceIdentifier
      },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '30d' }
    );

    // ✅ Store refresh token
    deviceTokens.set(refreshToken, {
      userId: user.id,
      deviceId: deviceIdentifier,
      createdAt: Date.now()
    });

    let favoriteAddresses = [];
    if (user.role === 'client' && profile?.id) {
      favoriteAddresses = await favoriteAddressService.listFavoriteAddresses(profile.id);
    }

    // ✅ Response
    res.json({
      message: 'Login successful',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      profile,
      favorite_addresses: favoriteAddresses
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// ✅ Nouvelle fonction pour créer un compte cashier (par admin ou restaurant)
export const registerCashier = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      restaurant_id,
      permissions,
      profile_image_url,
      status,
      is_active,
      notes
    } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !phone || !restaurant_id) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Verify restaurant exists
    const restaurant = await Restaurant.findByPk(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Create user account
    const user = await User.create({ 
      email, 
      password, 
      role: 'cashier' 
    });

    // Generate cashier code
    const cashierCode = await Cashier.generateCashierCode();

    // Create cashier profile
    const parsedPermissions = (() => {
      if (typeof permissions === "string") {
        try {
          return JSON.parse(permissions);
        } catch (_err) {
          return null;
        }
      }
      return permissions;
    })();

    const defaultPermissions = {
      can_create_orders: true,
      can_cancel_orders: false,
      can_apply_discounts: false,
      can_process_refunds: false,
      can_view_reports: false
    };

    const finalPermissions = {
      ...defaultPermissions,
      ...(parsedPermissions && typeof parsedPermissions === "object" ? parsedPermissions : {})
    };

    const finalStatus = CASHIER_STATUS_VALUES.includes(status) ? status : "offline";
    const isActiveFlag = typeof is_active === "boolean" ? is_active : true;

    const cashier = await Cashier.create({
      user_id: user.id,
      restaurant_id,
      cashier_code: cashierCode,
      first_name,
      last_name,
      phone: normalizePhoneNumber(phone),
      email,
      permissions: finalPermissions,
      profile_image_url: profile_image_url || null,
      status: finalStatus,
      is_active: isActiveFlag,
      notes: notes || null
    });

    res.status(201).json({
      message: 'Cashier registered successfully',
      data: {
        user_id: user.id,
        cashier_id: cashier.id,
        cashier_code: cashier.cashier_code,
        email: user.email,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name
        }
      }
    });

  } catch (error) {
    console.error('Register cashier error:', error);
    res.status(500).json({ 
      message: 'Registration failed', 
      error: error.message 
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile;
    switch (user.role) {
      case 'client':
        profile = await Client.findOne({ where: { user_id: user.id } });
        break;
      case 'driver':
        profile = await Driver.findOne({ where: { user_id: user.id } });
        break;
      case 'restaurant':
        profile = await Restaurant.findOne({ where: { user_id: user.id } });
        break;
    }

    res.json({ user, profile });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};
