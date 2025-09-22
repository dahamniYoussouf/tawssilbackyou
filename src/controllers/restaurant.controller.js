const Restaurant = require('../models/Restaurant');
const { Op, fn, col, literal } = require('sequelize');

exports.create = async (req, res) => {
  try {
    const { name, description, address, lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Les coordonnées (lat, lng) sont requises' 
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ 
        error: 'Coordonnées invalides' 
      });
    }

    const resto = await Restaurant.create({
      name,
      description,
      address,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }
    });

    res.status(201).json({
      success: true,
      data: resto
    });
  } catch (err) {
    console.error('Erreur création restaurant:', err);
    res.status(500).json({ 
      error: 'Erreur lors de la création du restaurant',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const restaurants = await Restaurant.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: restaurants
    });
  } catch (err) {
    console.error('Erreur récupération restaurants:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.nearby = async (req, res) => {
  try {
    const { lat, lng, radius = 2000 } = req.query;
    
    // Validation des paramètres
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Les paramètres lat et lng sont requis' 
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseInt(radius);

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        error: 'Coordonnées invalides' 
      });
    }

    if (isNaN(searchRadius) || searchRadius <= 0 || searchRadius > 50000) {
      return res.status(400).json({ 
        error: 'Le rayon doit être entre 1 et 50000 mètres' 
      });
    }

    console.log('Searching restaurants near:', { latitude, longitude, searchRadius });

    try {
      // First, try the PostGIS approach
      const result = await Restaurant.findAll({
        attributes: {
          include: [
            [
              literal(`ST_Distance(location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`),
              'distance'
            ]
          ]
        },
        where: literal(
          `ST_DWithin(location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`
        ),
        order: literal('distance ASC'),
        limit: 50 
      });

      res.json({
        success: true,
        count: result.length,
        radius: searchRadius,
        center: { latitude, longitude },
        data: result
      });

    } catch (postGISError) {
      console.log('PostGIS query failed, trying fallback method:', postGISError.message);
      
      // Fallback: Get all restaurants and filter with JavaScript
      const allRestaurants = await Restaurant.findAll({
        limit: 1000 // Reasonable limit for fallback
      });

      // Calculate distance using Haversine formula
      const nearbyRestaurants = allRestaurants.filter(restaurant => {
        if (!restaurant.location || !restaurant.location.coordinates) {
          return false;
        }
        
        const [restLng, restLat] = restaurant.location.coordinates;
        const distance = calculateDistance(latitude, longitude, restLat, restLng);
        
        // Add distance to the restaurant object
        restaurant.dataValues.distance = distance;
        
        return distance <= searchRadius;
      });

      // Sort by distance
      nearbyRestaurants.sort((a, b) => a.dataValues.distance - b.dataValues.distance);

      res.json({
        success: true,
        count: nearbyRestaurants.length,
        radius: searchRadius,
        center: { latitude, longitude },
        data: nearbyRestaurants.slice(0, 50), // Limit to 50 results
        fallback: true,
        message: 'Using fallback distance calculation'
      });
    }

  } catch (err) {
    console.error('Erreur recherche proximité:', err);
    res.status(500).json({ 
      error: 'Erreur lors de la recherche de restaurants à proximité',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      message: err.message // Add this for debugging
    });
  }
};

// Haversine formula for distance calculation (fallback)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
           Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
}

function toRad(degrees) {
  return degrees * (Math.PI/180);
}

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);
    
    if (!restaurant) {
      return res.status(404).json({ 
        error: 'Restaurant non trouvé' 
      });
    }
    
    res.json({
      success: true,
      data: restaurant
    });
  } catch (err) {
    console.error('Erreur récupération restaurant:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, address, lat, lng } = req.body;
    
    const restaurant = await Restaurant.findByPk(id);
    if (!restaurant) {
      return res.status(404).json({ 
        error: 'Restaurant non trouvé' 
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (address) updateData.address = address;
    
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
          error: 'Coordonnées invalides' 
        });
      }
      
      updateData.location = { 
        type: 'Point', 
        coordinates: [longitude, latitude] 
      };
    }

    await restaurant.update(updateData);
    
    res.json({
      success: true,
      data: restaurant
    });
  } catch (err) {
    console.error('Erreur mise à jour restaurant:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await Restaurant.findByPk(id);
    
    if (!restaurant) {
      return res.status(404).json({ 
        error: 'Restaurant non trouvé' 
      });
    }
    
    await restaurant.destroy();
    
    res.json({
      success: true,
      message: 'Restaurant supprimé avec succès'
    });
  } catch (err) {
    console.error('Erreur suppression restaurant:', err);
    res.status(500).json({ error: err.message });
  }
};