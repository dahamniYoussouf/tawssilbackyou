import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Driver from '../models/Driver.js';
import Restaurant from '../models/Restaurant.js';

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Register
export const register = async (req, res) => {
  try {
    const { email, password, role, ...profileData } = req.body;

    // Validate role
    if (!['client', 'driver', 'restaurant'].includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be client, driver, or restaurant' 
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
      case 'client':
        profile = await Client.create({
          user_id: user.id,
          email: email,
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone_number: profileData.phone_number || null,
          address: profileData.address || null
        });
        break;
      
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

  // Convert to numbers (in case they come as strings)
  const latitude = parseFloat(lat) || 0;
  const longitude = parseFloat(lng) || 0;

  profile = await Restaurant.create({
    user_id: user.id,
    name: profileData.name || 'New Restaurant',
    description: profileData.description || null,
    address: profileData.address || null,
    categories: profileData.categories || ['pizza'],
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    latitude,
    longitude
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

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if active
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get profile
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

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate token
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

    // Get role-specific profile
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