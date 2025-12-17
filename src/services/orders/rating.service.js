import Order from "../../models/Order.js";
import Restaurant from "../../models/Restaurant.js";
import Driver from "../../models/Driver.js";

const ensureDeliveredOrder = async (orderId) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw { status: 404, message: "Order not found" };
  if (order.status !== "delivered") throw { status: 400, message: "Order must be delivered before rating" };
  return order;
};

const updateRestaurantAverage = async (restaurantId, restaurantRating) => {
  if (!restaurantId) return;
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) return;
  const previousAvg = restaurant.rating ? parseFloat(restaurant.rating) : 0;
  const deliveredOrdersCount = await Order.count({
    where: {
      restaurant_id: restaurantId,
      status: 'delivered'
    }
  });
  const summary = ((previousAvg * deliveredOrdersCount) + parseFloat(restaurantRating)) / (deliveredOrdersCount + 1);
  await restaurant.update({ rating: parseFloat(summary.toFixed(1)) });
};

const updateDriverAverage = async (driverId, driverRating) => {
  if (!driverId) return;
  const driver = await Driver.findByPk(driverId);
  if (!driver) return;
  const previousAvg = driver.rating ? parseFloat(driver.rating) : 0;
  const deliveredCount = Number.isFinite(driver.total_deliveries)
    ? driver.total_deliveries
    : await Order.count({
        where: {
          livreur_id: driverId,
          status: 'delivered'
        }
      });
  const summary = ((previousAvg * deliveredCount) + parseFloat(driverRating)) / (deliveredCount + 1);
  await driver.update({ rating: parseFloat(summary.toFixed(1)) });
};

export async function addRestaurantRatingService(orderId, restaurantRating, restaurantComment) {
  const order = await ensureDeliveredOrder(orderId);
  if (order.rating !== null && order.rating !== undefined) {
    throw { status: 400, message: "Restaurant rating already submitted" };
  }

  const updates = {
    rating: parseFloat(restaurantRating)
  };
  if (restaurantComment !== undefined) {
    updates.restaurant_review_comment = restaurantComment;
  }

  await order.update(updates);
  await updateRestaurantAverage(order.restaurant_id, restaurantRating);
  await order.reload();
  return order;
}

export async function addDriverRatingService(orderId, driverRating, driverComment) {
  const order = await ensureDeliveredOrder(orderId);
  if (order.driver_rating !== null && order.driver_rating !== undefined) {
    throw { status: 400, message: "Driver rating already submitted" };
  }

  const updates = {
    driver_rating: parseFloat(driverRating)
  };
  if (driverComment !== undefined) {
    updates.driver_review_comment = driverComment;
  }

  await order.update(updates);
  await updateDriverAverage(order.livreur_id, driverRating);
  await order.reload();
  return order;
}
