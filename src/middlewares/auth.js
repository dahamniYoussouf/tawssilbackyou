import jwt from 'jsonwebtoken';
import User from '../models/User.js';


// Protect routes - verify access token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Non autorisé - Token manquant' });
    }

    // Verify access token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      // Token expired or invalid
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expiré',
          code: 'TOKEN_EXPIRED',
          expired: true 
        });
      }
      return res.status(401).json({ message: 'Token invalide' });
    }

    // Must be an access token
    if (decoded.type !== 'access') {
      return res.status(401).json({ message: 'Type de token invalide' });
    }

    // Load user
    req.user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    if (!req.user.is_active) {
      return res.status(403).json({ message: 'Compte désactivé' });
    }

    // Add profile IDs from token (no DB query needed!)
    if (decoded.client_id) {
      req.user.client_id = decoded.client_id;
    }
    
    if (decoded.driver_id) {
      req.user.driver_id = decoded.driver_id;
    }
    
    if (decoded.restaurant_id) {
      req.user.restaurant_id = decoded.restaurant_id;
    }

     if (decoded.admin_id) {
      req.user.admin_id = decoded.admin_id;
    }

    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Non autorisé' });
  }
};

// Verify role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Rôle ${req.user.role} non autorisé pour cette action` 
      });
    }
    next();
  };
};

// Role-specific middlewares
export const isClient = (req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ message: 'Accès réservé aux clients' });
  }
  next();
};

export const isDriver = (req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Accès réservé aux livreurs' });
  }
  next();
};

export const isRestaurant = (req, res, next) => {
  if (req.user.role !== 'restaurant') {
    return res.status(403).json({ message: 'Accès réservé aux restaurants' });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }
  next();
};