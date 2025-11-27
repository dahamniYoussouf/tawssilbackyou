import { Sequelize, Op } from "sequelize";
import FavoriteMeal from "../models/FavoriteMeal.js";
import FavoriteRestaurant from "../models/FavoriteRestaurant.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import Driver from "../models/Driver.js";
import OrderItem from "../models/OrderItem.js";
import Order from "../models/Order.js";
import FoodCategory from "../models/FoodCategory.js";

/**
 * Get top 10 most liked meals
 * Based on: number of favorites + average order rating (if available)
 */
export const getTop10Meals = async () => {
  try {
    const topMeals = await FavoriteMeal.findAll({
      attributes: [
        'meal_id',
        [Sequelize.fn('COUNT', Sequelize.col('FavoriteMeal.id')), 'favorite_count']
      ],
      include: [
        {
          model: MenuItem,
          as: 'meal',
          attributes: ['id', 'nom', 'description', 'prix', 'photo_url', 'is_available', 'restaurant_id', 'category_id'],
          include: [
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['id', 'name', 'image_url', 'rating']
            },
            {
              model: FoodCategory,
              as: 'category',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      group: ['FavoriteMeal.meal_id', 'meal.id', 'meal.restaurant.id', 'meal.category.id'],
      order: [[Sequelize.literal('favorite_count'), 'DESC']],
      limit: 20,
      raw: false
    });

    // Calculate average rating from orders for each meal
    const mealsWithRatings = await Promise.all(
      topMeals.map(async (item) => {
        const meal = item.meal;
        if (!meal) return null;

        // Get average rating from orders that contain this meal
        const ordersWithMeal = await OrderItem.findAll({
          where: { menu_item_id: meal.id },
          include: [
            {
              model: Order,
              as: 'order',
              attributes: ['id', 'rating'],
              where: {
                rating: { [Op.not]: null },
                status: 'delivered'
              }
            }
          ]
        });

        const ratings = ordersWithMeal
          .map(oi => oi.order?.rating)
          .filter(r => r != null)
          .map(r => parseFloat(r));

        const avgRating = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          : 0;

        const favoriteCount = parseInt(item.dataValues.favorite_count || 0);

        return {
          meal: {
            id: meal.id,
            nom: meal.nom,
            description: meal.description,
            prix: meal.prix,
            photo_url: meal.photo_url,
            is_available: meal.is_available,
            restaurant: meal.restaurant,
            category: meal.category
          },
          favorite_count: favoriteCount,
          average_rating: parseFloat(avgRating.toFixed(1)),
          total_ratings: ratings.length,
          score: favoriteCount * 2 + avgRating * 3 // Weighted score
        };
      })
    );

    // Sort by score and return top 10
    return mealsWithRatings
      .filter(item => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting top 10 meals:', error);
    throw error;
  }
};

/**
 * Get top 10 best restaurants
 * Based on: number of favorites + rating + number of orders
 */
export const getTop10Restaurants = async () => {
  try {
    const topRestaurants = await FavoriteRestaurant.findAll({
      attributes: [
        'restaurant_id',
        [Sequelize.fn('COUNT', Sequelize.col('FavoriteRestaurant.id')), 'favorite_count']
      ],
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'description', 'address', 'image_url', 'rating', 'is_active', 'status']
        }
      ],
      group: ['restaurant_id', 'restaurant.id'],
      order: [[Sequelize.literal('favorite_count'), 'DESC']],
      limit: 20, // Get more to filter by rating
      raw: false
    });

    // Calculate additional metrics for each restaurant
    const restaurantsWithMetrics = await Promise.all(
      topRestaurants.map(async (item) => {
        const restaurant = item.restaurant;
        if (!restaurant || restaurant.status !== 'approved' || !restaurant.is_active) {
          return null;
        }

        // Count total orders
        const totalOrders = await Order.count({
          where: {
            restaurant_id: restaurant.id,
            status: 'delivered'
          }
        });

        // Get average rating from orders
        const orders = await Order.findAll({
          where: {
            restaurant_id: restaurant.id,
            rating: { [Op.not]: null },
            status: 'delivered'
          },
          attributes: ['rating']
        });

        const ratings = orders.map(o => parseFloat(o.rating)).filter(r => !isNaN(r));
        const avgOrderRating = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          : 0;

        // Use restaurant.rating if available, otherwise use avgOrderRating
        const finalRating = restaurant.rating 
          ? parseFloat(restaurant.rating) 
          : avgOrderRating;

        const favoriteCount = parseInt(item.dataValues.favorite_count || 0);

        return {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            description: restaurant.description,
            address: restaurant.address,
            image_url: restaurant.image_url,
            rating: finalRating,
            is_active: restaurant.is_active
          },
          favorite_count: favoriteCount,
          total_orders: totalOrders,
          average_rating: parseFloat(finalRating.toFixed(1)),
          total_ratings: ratings.length,
          score: favoriteCount * 2 + finalRating * 3 + totalOrders * 0.1 // Weighted score
        };
      })
    );

    // Sort by score and return top 10
    return restaurantsWithMetrics
      .filter(item => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting top 10 restaurants:', error);
    throw error;
  }
};

/**
 * Get top 10 best drivers
 * Based on: rating + total_deliveries + cancellation_count (lower is better)
 */
export const getTop10Drivers = async () => {
  try {
    const drivers = await Driver.findAll({
      where: {
        is_active: true,
        is_verified: true
      },
      attributes: [
        'id',
        'driver_code',
        'first_name',
        'last_name',
        'phone',
        'email',
        'vehicle_type',
        'rating',
        'total_deliveries',
        'cancellation_count',
        'profile_image_url',
        'status'
      ],
      order: [
        ['rating', 'DESC'],
        ['total_deliveries', 'DESC']
      ],
      limit: 50 // Get more to calculate score
    });

    // Calculate score for each driver
    const driversWithScore = drivers.map(driver => {
      const rating = parseFloat(driver.rating || 0);
      const deliveries = parseInt(driver.total_deliveries || 0);
      const cancellations = parseInt(driver.cancellation_count || 0);
      
      // Score: rating * 3 + deliveries * 0.5 - cancellations * 2
      const score = rating * 3 + deliveries * 0.5 - cancellations * 2;

      return {
        driver: {
          id: driver.id,
          driver_code: driver.driver_code,
          first_name: driver.first_name,
          last_name: driver.last_name,
          phone: driver.phone,
          email: driver.email,
          vehicle_type: driver.vehicle_type,
          profile_image_url: driver.profile_image_url,
          status: driver.status
        },
        rating: parseFloat(rating.toFixed(1)),
        total_deliveries: deliveries,
        cancellation_count: cancellations,
        score
      };
    });

    // Sort by score and return top 10
    return driversWithScore
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting top 10 drivers:', error);
    throw error;
  }
};

