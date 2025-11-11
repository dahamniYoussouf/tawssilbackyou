import { Op, literal } from "sequelize";
import Order from "../../models/Order.js";
import Restaurant from "../../models/Restaurant.js";
import Client from "../../models/Client.js";
import Driver from "../../models/Driver.js";

export const getNearbyOrders = async (driverId, filters = {}) => {
  const { radius = 5000, status = ["preparing", "accepted"], page = 1, pageSize = 20, min_fee, max_distance } = filters;

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw { status: 404, message: "Driver not found" };

  if (!driver.canAcceptMoreOrders()) {
    return {
      orders: [],
      pagination: { current_page: parseInt(page, 10), total_pages: 0, total_items: 0, items_in_page: 0 },
      driver_location: driver.getCurrentCoordinates(),
      search_radius_km: (radius / 1000).toFixed(2),
      message: `You have reached maximum capacity (${driver.active_orders.length}/${driver.max_orders_capacity} orders)`,
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
      literal(`ST_DWithin(delivery_location, ST_GeogFromText('POINT(${longitude} ${latitude})'), ${searchRadius})`),
    ],
  };

  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    whereConditions[Op.and].push({ status: { [Op.in]: statusArray } });
  }
  if (min_fee) whereConditions[Op.and].push({ delivery_fee: { [Op.gte]: parseFloat(min_fee) } });

  const limit = parseInt(pageSize, 10);
  const offset = (parseInt(page, 10) - 1) * limit;

  const { count, rows } = await Order.findAndCountAll({
    attributes: {
      include: [
        [literal(`ST_Distance(delivery_location, ST_GeogFromText('POINT(${longitude} ${latitude})'))`), "distance"],
      ],
    },
    where: whereConditions,
    include: [
      { model: Restaurant, as: "restaurant", attributes: ["id", "name", "address", "location", "image_url"] },
      { model: Client, as: "client", attributes: ["id", "first_name", "last_name", "phone_number"] },
    ],
    order: [[literal("distance"), "ASC"], ["created_at", "DESC"]],
    limit,
    offset,
  });

  const formatted = rows
    .map((order) => {
      const restaurantCoords = order.restaurant.location?.coordinates || [];
      const deliveryCoords = order.delivery_location?.coordinates || [];
      const distance = parseFloat(order.dataValues.distance);

      if (max_distance && distance > max_distance) return null;

      return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: parseFloat(order.total_amount),
        delivery_fee: parseFloat(order.delivery_fee),
        delivery_address: order.delivery_address,
        delivery_location: { lat: deliveryCoords[1] || null, lng: deliveryCoords[0] || null },
        distance_meters: Math.round(distance),
        distance_km: (distance / 1000).toFixed(2),
        restaurant: {
          id: order.restaurant.id,
          name: order.restaurant.name,
          address: order.restaurant.address,
          location: { lat: restaurantCoords[1] || null, lng: restaurantCoords[0] || null },
          image_url: order.restaurant.image_url,
        },
        client: { name: `${order.client.first_name} ${order.client.last_name}`, phone: order.client.phone_number },
        estimated_delivery_time: order.estimated_delivery_time,
        created_at: order.created_at,
      };
    })
    .filter(Boolean);

  return {
    orders: formatted,
    pagination: {
      current_page: parseInt(page, 10),
      total_pages: Math.ceil(count / limit),
      total_items: count,
      items_in_page: formatted.length,
    },
    driver_location: { lat: latitude, lng: longitude },
    search_radius_km: (searchRadius / 1000).toFixed(2),
  };
};
