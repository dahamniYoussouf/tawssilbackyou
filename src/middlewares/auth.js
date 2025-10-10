import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware pour protéger les routes
export const protect = async (req, res, next) => {
  try {
    let token;

    // Récupérer le token du header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Non autorisé - Token manquant' });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Récupérer l'utilisateur (sans le mot de passe)
    req.user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    if (!req.user.is_active) {
      return res.status(403).json({ message: 'Compte désactivé' });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Non autorisé - Token invalide' });
  }
};

// Middleware pour vérifier le rôle
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

// Middleware pour vérifier si c'est un client
export const isClient = (req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ message: 'Accès réservé aux clients' });
  }
  next();
};

// Middleware pour vérifier si c'est un driver
export const isDriver = (req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Accès réservé aux livreurs' });
  }
  next();
};

// Middleware pour vérifier si c'est un restaurant
export const isRestaurant = (req, res, next) => {
  if (req.user.role !== 'restaurant') {
    return res.status(403).json({ message: 'Accès réservé aux restaurants' });
  }
  next();
};