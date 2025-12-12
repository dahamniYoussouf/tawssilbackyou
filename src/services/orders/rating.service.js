import { Op } from "sequelize";
import Order from "../../models/Order.js";
import Restaurant from "../../models/Restaurant.js";
import Driver from "../../models/Driver.js";

/**
 * Add ratings for restaurant and/or driver on a delivered order.
 * Applies average update using the rated orders count to keep consistency.
 */
export async function addRatingService(orderId, restaurantRating, driverRating, reviewComment) {
  const order = await Order.findByPk(orderId);

  if (!order) throw { status: 404, message: "Order not found" };
  if (order.status !== "delivered") throw { status: 400, message: "Order must be delivered before rating" };

  const hasRestaurantRating = restaurantRating !== undefined && restaurantRating !== null;
  const hasDriverRating = driverRating !== undefined && driverRating !== null;

  if (!hasRestaurantRating && !hasDriverRating) {
    throw { status: 400, message: "At least one rating (restaurant or driver) is required" };
  }

  if (order.rating || order.driver_rating) {
    throw { status: 400, message: "Order already rated" };
  }

  const updates = {};

  if (hasRestaurantRating) {
    updates.rating = parseFloat(restaurantRating);
  }
  if (hasDriverRating) {
    updates.driver_rating = parseFloat(driverRating);
  }
  if (reviewComment !== undefined) {
    updates.review_comment = reviewComment;
  }

  await order.update(updates);

  // Update restaurant average rating
  if (hasRestaurantRating && order.restaurant_id) {
    const restaurant = await Restaurant.findByPk(order.restaurant_id);
    if (restaurant) {
      const previousAvg = restaurant.rating ? parseFloat(restaurant.rating) : 0;
      const deliveredOrdersCount = await Order.count({
        where: {
          restaurant_id: order.restaurant_id,
          status: 'delivered'
        }
      });
      // Logical weighted average: (ancienne_moyenne * total_commandes + nouvelle_note) / (total_commandes + 1)
      const newRestaurantAvg = ((previousAvg * deliveredOrdersCount) + parseFloat(restaurantRating)) / (deliveredOrdersCount + 1);
      await restaurant.update({ rating: parseFloat(newRestaurantAvg.toFixed(1)) });
    }
  }

  // Update driver average rating
  if (hasDriverRating && order.livreur_id) {
    const driver = await Driver.findByPk(order.livreur_id);
    if (driver) {
      const previousAvg = driver.rating ? parseFloat(driver.rating) : 0;
      const deliveredCount = Number.isFinite(driver.total_deliveries)
        ? driver.total_deliveries
        : await Order.count({
            where: {
              livreur_id: order.livreur_id,
              status: 'delivered'
            }
          });
      // Logical weighted average: (ancienne_moyenne * total_commandes + nouvelle_note) / (total_commandes + 1)
      const newDriverAvg = ((previousAvg * deliveredCount) + parseFloat(driverRating)) / (deliveredCount + 1);
      await driver.update({ rating: parseFloat(newDriverAvg.toFixed(1)) });
    }
  }

  await order.reload();
  return order;
}
