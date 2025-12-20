import { Op } from "sequelize";
import Order from "../../models/Order.js";
import Restaurant from "../../models/Restaurant.js";
import Client from "../../models/Client.js";
import Driver from "../../models/Driver.js";
import OrderItem from "../../models/OrderItem.js";
import OrderItemAddition from "../../models/OrderItemAddition.js";
import Addition from "../../models/Addition.js";
import MenuItem from "../../models/MenuItem.js";

export async function getAllOrdersService(filters = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    order_type,
    client_id,
    restaurant_id,
    date_from,
    date_to,
    search,
  } = filters;

  const offset = (page - 1) * limit;
  const where = {};

  if (status) where.status = status;
  if (order_type) where.order_type = order_type;
  if (client_id) where.client_id = client_id;
  if (restaurant_id) where.restaurant_id = restaurant_id;
  if (search) where.order_number = { [Op.iLike]: `%${search}%` };

  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at[Op.gte] = new Date(date_from);
    if (date_to) where.created_at[Op.lte] = new Date(date_to);
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: OrderItem,
        as: "order_items",
        include: [
          { model: MenuItem, as: "menu_item" },
          {
            model: OrderItemAddition,
            as: "additions",
            include: [{ model: Addition, as: "addition" }],
          },
        ],
      },
      {
        model: Restaurant,
        as: "restaurant",
        attributes: ["id", "name", "image_url", "email", "address", "phone_number"],
      },
      {
        model: Client,
        as: "client",
        attributes: ["id", "first_name", "last_name", "email", "phone_number", "address"],
      },
      { model: Driver, as: "driver", attributes: ["id", "first_name", "last_name", "phone", "current_location"] },
    ],
    order: [["created_at", "DESC"]],
    limit: +limit,
    offset: +offset,
  });

  return {
    orders: rows,
    pagination: {
      current_page: +page,
      total_pages: Math.ceil(count / limit),
      total_items: count
    }
  };
}


export async function getOrderByIdService(id) {
  const order = await Order.findByPk(id, {
    include: [
      { model: Restaurant, as: "restaurant" },
      { model: Client, as: "client" },
      {
        model: OrderItem,
        as: "order_items",
        include: [
          { model: MenuItem, as: "menu_item" },
          {
            model: OrderItemAddition,
            as: "additions",
            include: [{ model: Addition, as: "addition" }],
          },
        ],
      },
      {
        model: Driver,
        as: "driver",
        attributes: ["id", "first_name", "last_name", "phone", "vehicle_type", "rating", "current_location"],
      },
    ],
  });

  if (!order) throw { status: 404, message: "Order not found" };

  const result = order.toJSON();

  if (order.status === "delivering" && order.driver) {
    result.tracking = {
      driver_location: order.driver.getCurrentCoordinates(),
      delivery_destination: order.delivery_location?.coordinates
        ? { longitude: order.delivery_location.coordinates[0], latitude: order.delivery_location.coordinates[1] }
        : null,
      time_in_transit: order.getTimeInStatus(),
      estimated_arrival: order.estimated_delivery_time,
    };
  }

  return result;
}

export async function getClientOrdersService(clientId, filters = {}) {
  const { page = 1, limit = 10, status } = filters;
  const offset = (page - 1) * limit;
  const where = { client_id: clientId };

  if (status) where.status = status;

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      { model: Restaurant, as: "restaurant", attributes: ["id", "name", "image_url", "rating", "email"] },
      { model: Driver, as: "driver", attributes: ["id", "first_name", "last_name", "phone"] },
      {
        model: OrderItem,
        as: "order_items",
        include: [
          { model: MenuItem, as: "menu_item" },
          {
            model: OrderItemAddition,
            as: "additions",
            include: [{ model: Addition, as: "addition" }],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
    limit: +limit,
    offset: +offset,
  });

  return {
    orders: rows,
    pagination: {
      current_page: +page,
      total_pages: Math.ceil(count / limit),
      total_items: count,
    },
  };
}

export async function getDriverActiveOrders(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw { status: 404, message: "Driver not found" };

  if (!driver.hasActiveOrders()) {
    return {
      driver_id: driverId,
      active_orders: [],
      count: 0,
      capacity: driver.max_orders_capacity,
    };
  }

  const orders = await Order.findAll({
    where: { id: driver.active_orders },
    include: [
      { model: Restaurant, as: "restaurant", attributes: ["id", "name", "address", "location", "email"] },
      { model: Client, as: "client", attributes: ["id", "first_name", "last_name", "phone_number"] },
      {
        model: OrderItem,
        as: "order_items",
        include: [
          { model: MenuItem, as: "menu_item" },
          {
            model: OrderItemAddition,
            as: "additions",
            include: [{ model: Addition, as: "addition" }],
          },
        ],
      },
    ],
    order: [["assigned_at", "ASC"]],
  });

  return {
    driver_id: driverId,
    active_orders: orders.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      restaurant: {
        name: order.restaurant.name,
        address: order.restaurant.address,
        location: order.restaurant.location?.coordinates,
      },
      delivery_address: order.delivery_address,
      delivery_location: order.delivery_location?.coordinates,
      total_amount: parseFloat(order.total_amount),
      assigned_at: order.assigned_at,
    })),
    count: orders.length,
    capacity: driver.max_orders_capacity,
  };
}
