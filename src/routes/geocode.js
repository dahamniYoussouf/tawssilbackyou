import express from "express";
import axios from "axios";
import { geocodeValidator } from "../validators/geocodeValidator.js";
import { validate } from "../middlewares/validate.js";

const router = express.Router();

const geocodeProviders = [
  {
    name: "nominatim",
    url: "https://nominatim.openstreetmap.org/search",
    params: (address) => ({ q: address, format: "json", limit: 1 }),
    extract: (data) => {
      if (!Array.isArray(data) || !data.length) return null;
      const [first] = data;
      if (!first?.lat || !first?.lon) return null;
      return {
        lat: first.lat,
        lng: first.lon,
        display_name: first.display_name || null
      };
    }
  },
  {
    name: "photon",
    url: "https://api.photon.komoot.io/api/",
    params: (address) => ({ q: address, limit: 1 }),
    extract: (data) => {
      const feature = data?.features?.[0];
      if (!feature?.geometry?.coordinates) return null;
      const [lon, lat] = feature.geometry.coordinates;
      return {
        lat,
        lng: lon,
        display_name: feature.properties?.name || feature.properties?.city || feature.properties?.state || null
      };
    }
  },
  {
    name: "mapsco",
    url: "https://geocode.maps.co/search",
    params: (address) => ({ q: address, limit: 1 }),
    extract: (data) => {
      const [first] = Array.isArray(data) ? data : [];
      if (!first?.lat || !first?.lon) return null;
      return {
        lat: first.lat,
        lng: first.lon,
        display_name: first.display_name || first.name || null
      };
    }
  }
];

const tryGeocodeFromProviders = async (address) => {
  let lastError = null;

  for (const provider of geocodeProviders) {
    try {
      const response = await axios.get(provider.url, {
        params: provider.params(address),
        timeout: 10000,
        headers: { "User-Agent": "food-delivery-app" }
      });

      const location = provider.extract(response.data);
      if (location) {
        return { location, provider: provider.name };
      }
    } catch (err) {
      lastError = err;
    }
  }

  return { location: null, error: lastError };
};

router.post("/geocode", geocodeValidator, validate, async (req, res, next) => {
  try {
    const { address } = req.body;
    const { location, error } = await tryGeocodeFromProviders(address);

    if (!location) {
      if (error) throw error;
      return res.status(404).json({
        success: false,
        error: "Adresse introuvable"
      });
    }

    res.json({
      success: true,
      lat: location.lat,
      lng: location.lng,
      display_name: location.display_name
    });
  } catch (err) {
    if (err.status || err.statusCode) {
      return next(err);
    }

    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      const timeoutError = new Error("Service de géocodage indisponible (timeout). Veuillez réessayer.");
      timeoutError.status = 503;
      return next(timeoutError);
    }

    if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED" || err.response?.status >= 500) {
      const serviceError = new Error("Service de géocodage indisponible. Veuillez réessayer plus tard.");
      serviceError.status = 503;
      return next(serviceError);
    }

    if (err.response?.status === 429) {
      const rateLimitError = new Error("Trop de requêtes de géocodage. Veuillez réessayer plus tard.");
      rateLimitError.status = 429;
      return next(rateLimitError);
    }

    const geocodeError = new Error("Impossible de géocoder l'adresse. Veuillez vérifier l'adresse.");
    geocodeError.status = 400;
    next(geocodeError);
  }
});

export default router;
