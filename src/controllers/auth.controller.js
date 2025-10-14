import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Driver from '../models/Driver.js';
import Restaurant from '../models/Restaurant.js';

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
    { expiresIn: '15m' }  // Short-lived for security
  );
};

// Generate LONG-LIVED refresh token (30 days)
const generateRefreshToken = (userId, role, deviceId) => {
  return jwt.sign(
    { id: userId, role, type: 'refresh', deviceId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: '30d' }  // Long-lived for convenience
  );
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS
const sendOTP = async (phoneOrEmail, otp) => {
  console.log(`📱 OTP envoyé à ${phoneOrEmail}: ${otp}`);
  // TODO: Integrate real SMS service
  return true;
};

// ============================================
// CLIENT AUTHENTICATION FLOW
// ============================================

// STEP 1: Request OTP (First time or when token expired)
export const requestOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ message: 'Numéro de téléphone requis' });
    }

    // Check if client exists
    let client = await Client.findOne({ where: { phone_number } });
    let isNewUser = false;
    
    // Create new client if doesn't exist
    if (!client) {
      const tempEmail = `${phone_number}@temp.local`;
      const user = await User.create({ 
        email: tempEmail, 
        password: Math.random().toString(36),
        role: 'client' 
      });

      client = await Client.create({
        user_id: user.id,
        email: tempEmail,
        phone_number,
        first_name: '',
        last_name: ''
      });
      
      isNewUser = true;
      console.log(`✨ New client registered: ${phone_number}`);
    }

    // Generate and store OTP
    const otp = generateOTP();
    otpStore.set(phone_number, {
      code: otp,
      clientId: client.id,
      userId: client.user_id,
      expiresAt: Date.now() + 5 * 60 * 1000  // 5 minutes
    });

    // Send OTP
    await sendOTP(phone_number, otp);

    res.json({ 
      message: 'OTP envoyé avec succès',
      phone_number,
      is_new_user: isNewUser,  // Tell frontend if this is first time
      // Dev only
      ...(process.env.NODE_ENV === 'development' && { dev_otp: otp })
    });
    
  } catch (error) {
    console.error('Erreur requestOTP:', error);
    res.status(500).json({ message: 'Échec envoi OTP', error: error.message });
  }
};

// STEP 2: Verify OTP and get LONG-LIVED tokens
export const verifyOTP = async (req, res) => {
  try {
    const { phone_number, otp, device_id } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({ message: 'Téléphone et OTP requis' });
    }

    // Get stored OTP
    const storedData = otpStore.get(phone_number);

    if (!storedData) {
      return res.status(400).json({ message: 'OTP non trouvé ou expiré' });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(phone_number);
      return res.status(400).json({ message: 'OTP expiré' });
    }

    // Verify code
    if (storedData.code !== otp) {
      return res.status(400).json({ message: 'OTP invalide' });
    }

    // OTP valid - clean up
    otpStore.delete(phone_number);

    // Load user and profile
    const user = await User.findByPk(storedData.userId);
    const client = await Client.findByPk(storedData.clientId);

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate device ID if not provided
    const deviceIdentifier = device_id || `device-${Date.now()}-${Math.random()}`;

    // Generate BOTH tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role, deviceIdentifier);

    // Store refresh token (in production, use Redis with TTL)
    deviceTokens.set(refreshToken, {
      userId: user.id,
      deviceId: deviceIdentifier,
      createdAt: Date.now()
    });

    // 🎉 Success - User is logged in for 30 days!
    res.json({
      message: 'Connexion réussie',
      access_token: accessToken,      // Short-lived (15 min)
      refresh_token: refreshToken,    // Long-lived (30 days)
      expires_in: 900,                // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      profile: client
    });
    
  } catch (error) {
    console.error('Erreur verifyOTP:', error);
    res.status(500).json({ message: 'Échec vérification OTP', error: error.message });
  }
};

// NEW: Refresh access token (called automatically by frontend)
export const refreshAccessToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ message: 'Refresh token requis' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refresh_token, 
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      );
    } catch (error) {
      return res.status(401).json({ message: 'Refresh token invalide ou expiré' });
    }

    // Check if token exists in store
    const tokenData = deviceTokens.get(refresh_token);
    if (!tokenData) {
      return res.status(401).json({ message: 'Refresh token révoqué' });
    }

    // Load user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Utilisateur invalide' });
    }

    // Generate new access token (refresh token stays the same)
    const newAccessToken = generateAccessToken(user.id, user.role);

    res.json({
      message: 'Token rafraîchi',
      access_token: newAccessToken,
      expires_in: 900  // 15 minutes
    });
    
  } catch (error) {
    console.error('Erreur refreshAccessToken:', error);
    res.status(500).json({ message: 'Échec rafraîchissement token' });
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

    res.json({ message: 'Déconnexion réussie' });
    
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({ message: 'Échec déconnexion' });
  }
};

// ============================================
// DRIVER/RESTAURANT LOGIN (Unchanged)
// ============================================

export const register = async (req, res) => {
  try {
    const { email, password, role, ...profileData } = req.body;

    if (!['driver', 'restaurant'].includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be driver or restaurant' 
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ email, password, role });

    let profile;
    switch (role) {
      case 'driver':
        profile = await Driver.create({
          user_id: user.id,
          email: email,
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
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

        const categories = profileData.categories || ['pizza'];
        if (!Array.isArray(categories) || categories.length === 0) {
          throw new Error('At least one category is required');
        }

        const isActive = profileData.is_active === undefined ? true : 
                         (typeof profileData.is_active === 'string' ? 
                          profileData.is_active === 'true' : 
                          profileData.is_active);
        
        const isPremium = profileData.is_premium === undefined ? false : 
                          (typeof profileData.is_premium === 'string' ? 
                           profileData.is_premium === 'true' : 
                           profileData.is_premium);

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
    const { email, password, device_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // ===== Load the profile =====
    let profile;
    let driver_id = null;
    let restaurant_id = null;

    switch (user.role) {
      case 'driver':
        profile = await Driver.findOne({ where: { user_id: user.id } });
        driver_id = profile?.id || null;
        break;

      case 'restaurant':
        profile = await Restaurant.findOne({ where: { user_id: user.id } });
        restaurant_id = profile?.id || null;
        break;
    }

    user.last_login = new Date();
    await user.save();

    // ===== Generate tokens with driver_id / restaurant_id =====
    const deviceIdentifier = device_id || `device-${Date.now()}`;

    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        driver_id,        // ajouté
        restaurant_id,    // ajouté
        type: 'access'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        driver_id,
        restaurant_id,
        type: 'refresh',
        deviceId: deviceIdentifier
      },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '30d' }
    );

    // ===== Store refresh token =====
    deviceTokens.set(refreshToken, {
      userId: user.id,
      deviceId: deviceIdentifier,
      createdAt: Date.now()
    });

    // ===== Response =====
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
      profile
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
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