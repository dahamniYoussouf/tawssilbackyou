import FoodCategory from "../models/FoodCategory.js";
import Restaurant from "../models/Restaurant.js";

export const createCategory = async (payload) => {
  // Optional: Verify restaurant exists
  if (payload.restaurant_id) {
    const restaurant = await Restaurant.findByPk(payload.restaurant_id);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }
  }
  
  return await FoodCategory.create(payload);
};

export const getAllCategories = async () => {
  return await FoodCategory.findAll({
    include: [{
      model: Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name']  // Include restaurant info
    }],
    order: [["ordre_affichage", "ASC"], ["created_at", "DESC"]],
  });
};

export const getCategoriesByRestaurant = async (restaurantId) => {
  return await FoodCategory.findAll({
    where: { restaurant_id: restaurantId },
    order: [["ordre_affichage", "ASC"], ["created_at", "DESC"]],
  });
};

export const getCategoryById = async (id) => {
  return await FoodCategory.findOne({ 
    where: { id },
    include: [{
      model: Restaurant,
      as: 'restaurant',
      attributes: ['id', 'name']
    }]
  });
};

export const updateCategory = async (id, payload) => {
  const category = await getCategoryById(id);
  if (!category) return null;
  
  // Optional: Verify new restaurant exists if changing restaurant
  if (payload.restaurant_id && payload.restaurant_id !== category.restaurant_id) {
    const restaurant = await Restaurant.findByPk(payload.restaurant_id);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }
  }
  
  await category.update(payload);
  return category;
};

export const deleteCategory = async (id) => {
  return await FoodCategory.destroy({ where: { id } });
};