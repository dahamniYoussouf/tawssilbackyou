import Order from "../../models/Order.js";
import Client from "../../models/Client.js";
import Driver from "../../models/Driver.js";
import calculateRouteTime from "../routingService.js";
import { notify } from "./notify.helper.js";

export async function updateDriverGPS(driverId, longitude, latitude) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw { status: 404, message: "Driver not found" };

  driver.setCurrentLocation(longitude, latitude);
  driver.last_active_at = new Date();
  await driver.save();

  if (driver.hasActiveOrders()) {
    const orders = await Order.findAll({
      where: { id: driver.active_orders, status: "delivering" },
      include: [{ model: Client, as: "client" }],
    });

    const currentLocation = driver.getCurrentCoordinates();

    for (const order of orders) {
      const destination = order.delivery_location?.coordinates;
      let routeInfo = null;
      if (destination?.length === 2) {
        const [destLng, destLat] = destination;
        routeInfo = await calculateRouteTime(longitude, latitude, destLng, destLat);
      }

      notify("client", order.client_id, {
        type: "order_location",
        orderId: order.id,
        location: currentLocation,
        distance_km: routeInfo?.distanceKm ?? null,
        eta_min: routeInfo?.timeMin ?? null,
        eta_max: routeInfo?.timeMax ?? null,
        message: routeInfo
          ? `Your order is ${routeInfo.distanceKm} km away (${routeInfo.timeMin}-${routeInfo.timeMax} min)`
          : "Your order is on the way",
      });
    }
  }

  return { driver_id: driverId, active_orders: driver.active_orders };
}

export async function getOrderTracking(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [
      {
        model: Driver,
        as: "driver",
        attributes: [
          "id",
          "first_name",
          "last_name",
          "phone",
          "vehicle_type",
          "vehicle_plate",
          "rating",
          "current_location",
        ],
      },
    ],
  });

  if (!order) throw { status: 404, message: "Order not found" };

  if (order.status !== "delivering") {
    return { order_id: orderId, status: order.status, message: "Order is not currently in delivery" };
  }

  const driverCoords = order.driver?.getCurrentCoordinates();
  const destinationCoords = order.delivery_location?.coordinates
    ? { longitude: order.delivery_location.coordinates[0], latitude: order.delivery_location.coordinates[1] }
    : null;

  return {
    order_id: orderId,
    order_number: order.order_number,
    status: order.status,
    driver: {
      id: order.driver.id,
      name: order.driver.getFullName(),
      phone: order.driver.phone,
      vehicle_type: order.driver.vehicle_type,
      vehicle_plate: order.driver.vehicle_plate,
      rating: order.driver.rating,
      current_location: driverCoords,
    },
    destination: destinationCoords,
    estimated_arrival: order.estimated_delivery_time,
    time_in_transit: order.getTimeInStatus(),
  };
}

export async function getRoutePreview(orderId, driverLng, driverLat) {
  const order = await Order.findByPk(orderId, { include: [{ model: Restaurant, as: "restaurant" }] });
  if (!order) throw { status: 404, message: "Order not found" };

  const rest = order.restaurant?.getCoordinates?.();
  const dest = order.delivery_location?.coordinates
    ? { longitude: order.delivery_location.coordinates[0], latitude: order.delivery_location.coordinates[1] }
    : null;

  let toRestaurant = null,
    toCustomer = null;
  if (driverLng != null && driverLat != null && rest) {
    toRestaurant = await calculateRouteTime(driverLng, driverLat, rest.longitude, rest.latitude);
  }
  if (rest && dest) {
    toCustomer = await calculateRouteTime(rest.longitude, rest.latitude, dest.longitude, dest.latitude);
  }
  return { toRestaurant, toCustomer };
}
