import express from "express";
import axios from "axios";

const router = express.Router();

router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: "Adresse manquante" });
    }

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
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;