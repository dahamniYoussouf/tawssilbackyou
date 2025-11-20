import { Op, literal } from "sequelize";
import Order from "../../models/Order.js";
import Restaurant from "../../models/Restaurant.js";
import Client from "../../models/Client.js";
import Driver from "../../models/Driver.js";
import OrderItem from "../../models/OrderItem.js";
import MenuItem from "../../models/MenuItem.js";
import calculateRouteTime from "../routingService.js";

export const getNearbyOrders = async (driverId, filters = {}) => {
  const { radius = 5000, status = ["preparing", "accepted"], page = 1, pageSize = 20, min_fee, max_distance } = filters;

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw { status: 404, message: "Driver not found" };
  if (!driver.is_verified) throw { status: 400, message: "Driver account is not verified" };

  if (!driver.canAcceptMoreOrders()) {
    return {
      orders: [],
      pagination: { current_page: parseInt(page, 10), total_pages: 0, total_items: 0, items_in_page: 0 },
      driver_location: driver.getCurrentCoordinates(),
      search_radius_km: (radius / 1000).toFixed(2),
      message: `You have reached maximum capacity (${driver.active_orders.length}/${driver.max_orders_capacity} orders)`
    };
  }

  if (!driver.current_location) throw { status: 400, message: "Driver location not available. Please enable GPS." };

  const coords = driver.getCurrentCoordinates();
  if (!coords) throw { status: 400, message: "Invalid driver location" };

  const { longitude, latitude } = coords;
  const searchRadius = parseInt(radius, 10);

  const whereConditions = {
    [Op.and]: [
      { order_type: "delivery" },
      { livreur_id: null },
      literal(`ST_DWithin(delivery_location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`)
    ]
  };

  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    whereConditions[Op.and].push({ status: { [Op.in]: statusArray } });
  }

  if (min_fee) {
    whereConditions[Op.and].push({ delivery_fee: { [Op.gte]: parseFloat(min_fee) } });
  }

  const limit = parseInt(pageSize, 10);
  const offset = (parseInt(page, 10) - 1) * limit;

  const { count, rows } = await Order.findAndCountAll({
    attributes: {
      include: [
        [literal(`ST_Distance(delivery_location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`), "distance"]
      ]
    },
    where: whereConditions,
    include: [
      { model: OrderItem, as: "order_items", include: [{ model: MenuItem, as: "menu_item" }] },
      { model: Restaurant, as: "restaurant", attributes: ["id", "name", "address", "location", "image_url"] },
      { model: Client, as: "client", attributes: ["id", "first_name", "last_name", "phone_number"] }
    ],
    order: [[literal("distance"), "ASC"], ["created_at", "DESC"]],
    limit,
    offset
  });

  // ✅ CALCULER LES ROUTES POUR CHAQUE COMMANDE
  const formatted = await Promise.all(rows.map(async (order) => {
    const restaurantCoords = order.restaurant.location?.coordinates || [];
    const deliveryCoords = order.delivery_location?.coordinates || [];
    const distance = parseFloat(order.dataValues.distance);

    if (max_distance && distance > max_distance) return null;

    // ✅ NOUVEAU: Calculer route Driver → Restaurant
    let routeToRestaurant = null;
    if (restaurantCoords.length === 2) {
      try {
        const route = await calculateRouteTime(
          longitude, // Driver longitude
          latitude,  // Driver latitude
          restaurantCoords[0], // Restaurant longitude
          restaurantCoords[1], // Restaurant latitude
          40 // Vitesse moyenne: 40 km/h
        );

        routeToRestaurant = {
          distance_km: route.distanceKm,
          estimated_time_min: route.timeMax
        };

        console.log(`📍 Route Driver→Restaurant (Order ${order.order_number}): ${route.distanceKm} km, ~${route.timeMax} min`);
      } catch (error) {
        console.error(`⚠️ Route calculation failed for order ${order.id}:`, error.message);
      }
    }

    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: parseFloat(order.total_amount),
      delivery_fee: parseFloat(order.delivery_fee),
      delivery_address: order.delivery_address,
      delivery_location: {
        lat: deliveryCoords[1] || null,
        lng: deliveryCoords[0] || null
      },
      
      // Distance du driver à la destination finale
      distance_to_delivery_meters: Math.round(distance),
      distance_to_delivery_km: (distance / 1000).toFixed(2),

      restaurant: {
        id: order.restaurant.id,
        name: order.restaurant.name,
        address: order.restaurant.address,
        location: {
          lat: restaurantCoords[1] || null,
          lng: restaurantCoords[0] || null
        },
        image_url: order.restaurant.image_url,
        
        // ✅ NOUVEAU: Route vers le restaurant
        distance_from_driver_km: routeToRestaurant?.distance_km || null,
        estimated_time_from_driver_min: routeToRestaurant?.estimated_time_min || null
      },

      client: {
        name: `${order.client.first_name} ${order.client.last_name}`,
        phone: order.client.phone_number
      },

      items: order.order_items || [],

      estimated_delivery_time: order.estimated_delivery_time,
      created_at: order.created_at,

      // ✅ RÉSUMÉ DE LA ROUTE COMPLÈTE
      route_summary: routeToRestaurant ? {
        driver_to_restaurant_km: routeToRestaurant.distance_km,
        driver_to_restaurant_min: routeToRestaurant.estimated_time_min,
        restaurant_to_delivery_km: order.delivery_distance ? parseFloat(order.delivery_distance) : null,
        total_distance_estimate_km: routeToRestaurant.distance_km + (order.delivery_distance ? parseFloat(order.delivery_distance) : 0)
      } : null
    };
  }));

  // Filtrer les null (commandes au-delà de max_distance)
  const validOrders = formatted.filter(Boolean);

  return {
    orders: validOrders,
    pagination: {
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(count / limit),
      total_items: count,
      items_in_page: validOrders.length
    },
    driver_location: { lat: latitude, lng: longitude },
    search_radius_km: (searchRadius / 1000).toFixed(2)
  };
};