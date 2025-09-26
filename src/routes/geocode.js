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
      headers: { 'User-Agent': 'food-delivery-app' }
    });

    if (response.data.length === 0) {
      return res.status(404).json({ error: "Adresse introuvable" });
    }

    const location = response.data[0];
    res.json({
      lat: location.lat,
      lng: location.lon,
      display_name: location.display_name
    });

  } catch (err) {
        next(err);
  }
});

export default router;