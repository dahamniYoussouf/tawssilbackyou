import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js"; 
import RestaurantCategory from "../models/RestaurantCategory.js"; 
import { Op, fn, col, literal } from "sequelize";
import axios from "axios";


export const create = async (req, res, next) => {
  try {
    const { name, description, address, lat, lng, rating, delivery_time_min, delivery_time_max, image_url, is_active, is_premium, status, opening_hours, category_id} = req.body;
    
    if (category_id) {
      const category = await RestaurantCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({ error: "Category not found" });
      }
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
      is_active, 
      is_premium,
      status, 
      opening_hours, 
      category_id
    });

    res.status(201).json({
      success: true
      
    });
  } catch (err) {
      next(err);
  }
};

export const getAll = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.findAll({
      order: [['created_at', 'DESC']]
    });
    
     const formatted = restaurants.map(r => ({
      ...r.toJSON(),
      is_open: r.isOpen() 
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
            next(err);
  }
};

export const nearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = 2000 } = req.query;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseInt(radius);

    const result = await Restaurant.findAll({
      attributes: {
        include: [
          [
            literal(`ST_Distance(location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`),
            'distance'
          ]
        ]
      },
      where: {
        [Op.and]: [
          { is_active: true },
          literal(
            `ST_DWithin(location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`
          )
        ]
      },
      order: [
        ['is_premium', 'DESC'],       
        [literal('distance'), 'ASC']   
      ],
      limit: 50 
    });

    const formatted = result.map(r => {
      const coords = r.location?.coordinates || [];
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        lat: coords[1] || null,   
        lng: coords[0] || null,   
        rating: r.rating,
        delivery_time_min: r.delivery_time_min,
        delivery_time_max: r.delivery_time_max,
        image_url: r.image_url,
        distance: r.dataValues.distance,
        is_premium: r.is_premium,
        status:r.status, 
        is_open: r.isOpen() 
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
    next(err);
}
};

export const nearbyFilter = async (req, res, next) => {
  try {
    // 📦 Get filters from request body
    const {
      address,
      lat,
      lng,
      radius = 2000,
      q,
      category,
      page = 1,
      pageSize = 20
    } = req.body;

    let latitude, longitude;

    // 🌍 Handle address-based search (geocoding)
    if (address && address.trim()) {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: address, format: "json", limit: 1 },
        headers: { "User-Agent": "food-delivery-app" }
      });

      if (response.data.length === 0) {
        return res.status(404).json({ error: "Adresse introuvable" });
      }

      const { lat: geocodedLat, lon: geocodedLon } = response.data[0];
      latitude = parseFloat(geocodedLat);
      longitude = parseFloat(geocodedLon);
    }
    // 📍 Handle coordinate-based search
    else if (lat && lng) {
      latitude = parseFloat(lat);
      longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Coordonnées invalides" });
      }
    }
    // ❌ Neither address nor coordinates provided
    else {
      return res.status(400).json({
        error: "Adresse ou coordonnées (lat, lng) requises"
      });
    }

    const searchRadius = parseInt(radius, 10);

    // 🟢 Base WHERE conditions
    const whereConditions = {
      [Op.and]: [
        { is_active: true },
        literal(
          `ST_DWithin(location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`
        )
      ]
    };

    // 🔎 Filter by restaurant name
    if (q && q.trim()) {
      whereConditions[Op.and].push({
        name: { [Op.iLike]: `%${q.trim()}%` }
      });
    }

    // 🍽️ Filter by restaurant category
    let includeOptions = [];
    if (category && category.trim()) {
      includeOptions.push({
        model: RestaurantCategory,
        as: "category",
        attributes: ["id", "nom"],
        where: { id: category.trim() },
        required: true
      });
    } else {
      includeOptions.push({
        model: RestaurantCategory,
        as: "category",
        attributes: ["id", "nom"]
      });
    }

    // 🔢 Pagination
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    // 🔥 Main query
    const result = await Restaurant.findAll({
      attributes: {
        include: [
          [
            literal(`ST_Distance(location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`),
            "distance"
          ]
        ]
      },
      where: whereConditions,
      include: includeOptions,
      order: [
        ["is_premium", "DESC"],
        [literal("distance"), "ASC"]
      ],
      limit,
      offset
    });

    // 📦 Format response
    const formatted = result.map(r => {
      const coords = r.location?.coordinates || [];
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        lat: coords[1] || null,
        lng: coords[0] || null,
        rating: r.rating,
        delivery_time_min: r.delivery_time_min,
        delivery_time_max: r.delivery_time_max,
        image_url: r.image_url,
        distance: r.dataValues.distance,
        is_premium: r.is_premium,
        status: r.status,
        is_open: r.isOpen(),
        category: r.category ? { id: r.category.id, name: r.category.nom } : null
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      page: parseInt(page, 10),
      pageSize: limit,
      radius: searchRadius,
      center: { lat: latitude, lng: longitude },
      data: formatted,
      searchType: address ? 'address' : 'coordinates'
    });
  } catch (err) {
    next(err);
  }
};



export const update = async (req, res, next) => {
  try {
    const { id } = req.params; 
    const {
      name,
      description,
      address,
      lat,
      lng,
      rating,
      delivery_time_min,
      delivery_time_max,
      image_url,
      is_active,
      is_premium,
      status,
      opening_hours
    } = req.body;

    const resto = await Restaurant.findOne({ where: { id } });

    if (!resto) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    await resto.update({
      name,
      description,
      address,
      location: lat && lng ? { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] } : resto.location,
      rating,
      delivery_time_min,
      delivery_time_max,
      image_url,
      is_active,
      is_premium,
      status,
      opening_hours
    });

    res.json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
};


export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Restaurant.destroy({
      where: { id }
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

export const nearbyByAddress = async (req, res, next) => {
  try {
    const { address, radius = 2000 } = req.query;

    if (!address) {
      return res.status(400).json({ error: "Adresse requise" });
    }

    // Géocoder l'adresse avec Nominatim
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: address, format: "json", limit: 1 },
      headers: { "User-Agent": "food-delivery-app" }
    });

    if (response.data.length === 0) {
      return res.status(404).json({ error: "Adresse introuvable" });
    }

    const { lat, lon } = response.data[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const searchRadius = parseInt(radius);

    // Réutiliser la même logique que nearby
    const result = await Restaurant.findAll({
      attributes: {
        include: [
          [
            literal(`ST_Distance(location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`),
            "distance"
          ]
        ]
      },
      where: {
        [Op.and]: [
          { is_active: true },
          literal(
            `ST_DWithin(location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`
          )
        ]
      },
      order: [
        ["is_premium", "DESC"],
        [literal("distance"), "ASC"]
      ],
      limit: 50
    });

    const formatted = result.map(r => {
      const coords = r.location?.coordinates || [];
      return {
        id: r.id,
        name: r.nom,
        description: r.description,
        address: r.address,
        lat: coords[1] || null,
        lng: coords[0] || null,
        rating: r.rating,
        delivery_time_min: r.delivery_time_min,
        delivery_time_max: r.delivery_time_max,
        image_url: r.image_url,
        distance: r.dataValues.distance,
        is_premium: r.is_premium,
        status: r.status,
        is_open: r.isOpen()
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      radius: searchRadius,
      center: { lat: latitude, lng: longitude },
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};


