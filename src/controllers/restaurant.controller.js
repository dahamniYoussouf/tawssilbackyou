import Restaurant from "../models/Restaurant.js";
import { Op, fn, col, literal } from "sequelize";

export const create = async (req, res, next) => {
  try {
    const { name, description, address, lat, lng, rating, delivery_time_min, delivery_time_max, image_url, is_active, is_premium, status, opening_hours} = req.body;

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
      opening_hours
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
