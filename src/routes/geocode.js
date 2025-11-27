import express from "express";
import axios from "axios";
import { geocodeValidator } from "../validators/geocodeValidator.js";
import { validate } from "../middlewares/validate.js";

const router = express.Router();


router.post('/geocode',geocodeValidator, validate, async (req, res, next) => {
  try {
    const { address } = req.body;
    
    const url = `https://nominatim.openstreetmap.org/search`;
    const response = await axios.get(url, {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: { 'User-Agent': 'food-delivery-app' },
      timeout: 10000 // 10 secondes timeout
    });

    if (response.data.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Adresse introuvable" 
      });
    }

    const location = response.data[0];
    res.json({
      success: true,
      lat: location.lat,
      lng: location.lon,
      display_name: location.display_name
    });

  } catch (err) {
    // Si c'est déjà une erreur avec un statut, la passer au middleware
    if (err.status || err.statusCode) {
      return next(err);
    }

    // Gérer les erreurs axios spécifiques
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      const timeoutError = new Error("Service de géocodage indisponible (timeout). Veuillez réessayer.");
      timeoutError.status = 503;
      return next(timeoutError);
    }

    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.response?.status >= 500) {
      const serviceError = new Error("Service de géocodage indisponible. Veuillez réessayer plus tard.");
      serviceError.status = 503;
      return next(serviceError);
    }

    if (err.response?.status === 429) {
      const rateLimitError = new Error("Trop de requêtes de géocodage. Veuillez réessayer plus tard.");
      rateLimitError.status = 429;
      return next(rateLimitError);
    }

    // Erreur générique
    const geocodeError = new Error("Impossible de géocoder l'adresse. Veuillez vérifier l'adresse.");
    geocodeError.status = 400;
    next(geocodeError);
  }
});

export default router;