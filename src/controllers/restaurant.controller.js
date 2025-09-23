const Restaurant = require('../models/Restaurant');
const { Op, fn, col, literal } = require('sequelize');

exports.create = async (req, res) => {
  try {
    const { name, description, address, lat, lng, rating, delivery_time_min, delivery_time_max, image_url, is_active} = req.body;
    
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
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      rating,
      delivery_time_min,
      delivery_time_max,
      image_url,
      is_active
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

    const formatted = result.map(r => {
      const coords = r.location?.coordinates || [];
      return {
        uuid: r.uuid,
        name: r.name,
        description: r.description,
        address: r.address,
        lat: coords[1] || null,   
        lng: coords[0] || null,   
        rating: r.rating,
        delivery_time_min: r.delivery_time_min,
        delivery_time_max: r.delivery_time_max,
        image_url: r.image_url,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
        distance: r.dataValues.distance
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      radius: searchRadius,
      center: { lat:latitude, lng:longitude },
      data: formatted
    });
  } catch (err) {
    console.error('Erreur recherche proximité:', err);
    res.status(500).json({ 
      error: 'Erreur lors de la recherche de restaurants à proximité',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

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
