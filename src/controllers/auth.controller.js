import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Driver from '../models/Driver.js';
import Restaurant from '../models/Restaurant.js';

// Store OTPs temporarily (en production, utilisez Redis)
const otpStore = new Map();

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP (simulé - remplacer par vrai service SMS/Email)
const sendOTP = async (phoneOrEmail, otp) => {
  console.log(`📱 OTP envoyé à ${phoneOrEmail}: ${otp}`);
  // TODO: Intégrer un service SMS (Twilio, etc.) ou Email
  return true;
};

// ÉTAPE 1: Demander OTP
export const requestOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ message: 'Numéro de téléphone requis' });
    }

    // Vérifier si le client existe
    let client = await Client.findOne({ where: { phone_number } });
    
    // Si pas de client, créer un nouveau
    if (!client) {
      const tempEmail = `${phone_number}@temp.local`;
      const user = await User.create({ 
        email: tempEmail, 
        password: Math.random().toString(36), // Mot de passe temporaire
        role: 'client' 
      });

      client = await Client.create({
        user_id: user.id,
        email: tempEmail,
        phone_number,
        first_name: '',
        last_name: ''
      });
    }

    // Générer et stocker OTP
    const otp = generateOTP();
    otpStore.set(phone_number, {
      code: otp,
      clientId: client.id,
      userId: client.user_id,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Envoyer OTP
    await sendOTP(phone_number, otp);

    res.json({ 
      message: 'OTP envoyé avec succès',
      phone_number,
      // En développement uniquement - RETIRER EN PRODUCTION
      dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    console.error('Erreur requestOTP:', error);
    res.status(500).json({ message: 'Échec envoi OTP', error: error.message });
  }
};

// ÉTAPE 2: Vérifier OTP et connecter
export const verifyOTP = async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({ message: 'Téléphone et OTP requis' });
    }

    // Récupérer OTP stocké
    const storedData = otpStore.get(phone_number);

    if (!storedData) {
      return res.status(400).json({ message: 'OTP non trouvé ou expiré' });
    }

    // Vérifier expiration
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(phone_number);
      return res.status(400).json({ message: 'OTP expiré' });
    }

    // Vérifier le code
    if (storedData.code !== otp) {
      return res.status(400).json({ message: 'OTP invalide' });
    }

    // OTP valide - supprimer du store
    otpStore.delete(phone_number);

    // Récupérer user et profil
    const user = await User.findByPk(storedData.userId);
    const client = await Client.findByPk(storedData.clientId);

    // Mettre à jour last login
    user.last_login = new Date();
    await user.save();

    // Générer token
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Connexion réussie',
      token,
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

// Register (pour driver et restaurant)
export const register = async (req, res) => {
  try {
    const { email, password, role, ...profileData } = req.body;

    // Validate role
    if (!['driver', 'restaurant'].includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be driver or restaurant' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({ email, password, role });

    // Create profile based on role
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

  // Validate coordinates
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Valid latitude and longitude are required');
  }

  // Validate and process categories
  const categories = profileData.categories || ['pizza'];
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('At least one category is required');
  }

  // Parse boolean values (in case they come as strings)
  const isActive = profileData.is_active === undefined ? true : 
                   (typeof profileData.is_active === 'string' ? 
                    profileData.is_active === 'true' : 
                    profileData.is_active);
  
  const isPremium = profileData.is_premium === undefined ? false : 
                    (typeof profileData.is_premium === 'string' ? 
                     profileData.is_premium === 'true' : 
                     profileData.is_premium);

  // Validate rating if provided
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
    status: 'pending', // Always pending for new registrations
    opening_hours: profileData.opening_hours || null,
    categories: categories
  });
  break;
}
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'Registration successful',
      token,
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

// Login (pour driver et restaurant)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Get profile
    let profile;
    switch (user.role) {
      case 'driver':
        profile = await Driver.findOne({ where: { user_id: user.id } });
        break;
      case 'restaurant':
        profile = await Restaurant.findOne({ where: { user_id: user.id } });
        break;
    }

    user.last_login = new Date();
    await user.save();

    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      token,
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

// Get profile
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