import { Op } from "sequelize";
import MenuItem from "../models/MenuItem.js";
import Addition from "../models/Addition.js";
import FoodCategory from "../models/FoodCategory.js";
import Restaurant from "../models/Restaurant.js";
import FavoriteMeal from "../models/FavoriteMeal.js";

// CREATE MENU ITEM
export async function createMenuItem(data) {
  const {
    category_id,
    nom,
    description,
    prix,
    photo_url,
    temps_preparation,
    is_available = true
  } = data;

  // Verify category exists
  const category = await FoodCategory.findByPk(category_id);
  if (!category) throw { status: 404, message: "Category not found" };

  return await MenuItem.create({
    restaurant_id: category.restaurant_id,
    category_id,
    nom,
    description,
    prix,
    photo_url,
    temps_preparation: temps_preparation || 20,
    is_available
  });
}

// GET ALL MENU ITEMS
export async function getAllMenuItems(filters = {}) {
  const {
    page = 1,
    limit = 20,
    category_id,
    restaurant_id,
    is_available,
    search
  } = filters;

  const offset = (page - 1) * limit;
  const where = {};

  if (category_id) {
    where.category_id = category_id;
  }
  if (is_available !== undefined) {
    where.is_available = is_available;
  }
  if (search) {
    where.nom = { [Op.iLike]: `%${search}%` };
  }

  const categoryInclude = {
    model: FoodCategory,
    as: 'category',
    attributes: ['id', 'nom']
  };

  if (restaurant_id) {
    categoryInclude.where = { restaurant_id };
    categoryInclude.required = true;
  }

  const include = [
    categoryInclude,
    { model: Restaurant, as: 'restaurant', attributes: ['id', 'name', 'image_url', 'email'] },
    { model: Addition, as: 'additions', attributes: ['id', 'nom', 'description', 'prix', 'is_available'] }
  ];

  const { count, rows } = await MenuItem.findAndCountAll({
    where,
    include,
    order: [['created_at', 'DESC']],
    limit: +limit,
    offset: +offset
  });

  return {
    items: rows,
    pagination: {
      current_page: +page,
      total_pages: Math.ceil(count / limit),
      total_items: count
    }
  };
}

// GET MENU ITEM BY ID
export async function getMenuItemById(id) {
  const item = await MenuItem.findByPk(id, {
    include: [
      { model: FoodCategory, as: 'category' },
      { model: Restaurant, as: 'restaurant' },
      { model: Addition, as: 'additions', attributes: ['id', 'nom', 'description', 'prix', 'is_available'] }
    ]
  });

  if (!item) throw { status: 404, message: "Menu item not found" };
  return item;
}

// GET MENU ITEMS BY CATEGORY (with favorites support)
export async function getMenuItemsByCategory(filters) {
  const { client_id, category_id, is_available = true } = filters;
  const where = {};

  // Only show available items by default
  if (is_available !== undefined) where.is_available = is_available;
  if (category_id) where.category_id = category_id;

  const items = await MenuItem.findAll({
    where,
    include: [
      { model: FoodCategory, as: "category", attributes: ["id", "nom"] },
      { model: Restaurant, as: "restaurant", attributes: ["id", "name", "email"] },
      { model: Addition, as: "additions", attributes: ["id", "nom", "description", "prix", "is_available"] }
    ],
    order: [['nom', 'ASC']]
  });

  // Get user favorites if client_id provided
  const favoritesMap = new Map();
  if (client_id) {
    const favorites = await FavoriteMeal.findAll({
      where: {
        client_id,
        meal_id: { [Op.in]: items.map(i => i.id) }
      },
      attributes: ["meal_id", "id"]
    });

    favorites.forEach(fav => favoritesMap.set(fav.meal_id, fav.id));
  }

  // Format response with favorite status
  const formatted = items.map(item => ({
    ...item.toJSON(),
    is_favorite: favoritesMap.has(item.id),
    favorite_id: favoritesMap.get(item.id) || null
  }));

  return {
    items: formatted,
    count: formatted.length
  };
}


// UPDATE MENU ITEM
export async function updateMenuItem(id, updates) {
  const item = await MenuItem.findByPk(id);
  if (!item) throw { status: 404, message: "Menu item not found" };

  // Validate category if being updated
  if (updates.category_id) {
    const category = await FoodCategory.findByPk(updates.category_id);
    if (!category) throw { status: 404, message: "Category not found" };
    updates.restaurant_id = category.restaurant_id;
  }

  await item.update(updates);
  
  return await MenuItem.findByPk(id, {
    include: [
      { model: FoodCategory, as: 'category' },
      { model: Restaurant, as: 'restaurant' }
    ]
  });
}

// DELETE MENU ITEM
export async function deleteMenuItem(id) {
  const item = await MenuItem.findByPk(id);
  if (!item) throw { status: 404, message: "Menu item not found" };

  await item.destroy();
  return { message: "Menu item deleted successfully" };
}

// TOGGLE AVAILABILITY
export async function toggleAvailability(id) {
  const item = await MenuItem.findByPk(id);
  if (!item) throw { status: 404, message: "Menu item not found" };

  item.is_available = !item.is_available;
  await item.save();

  return {
    id: item.id,
    nom: item.nom,
    is_available: item.is_available,
    message: `Menu item is now ${item.is_available ? 'available' : 'unavailable'}`
  };
}

// BULK UPDATE AVAILABILITY
export async function bulkUpdateAvailability(menu_item_ids, is_available) {
  const updated = await MenuItem.update(
    { is_available },
    {
      where: { id: { [Op.in]: menu_item_ids } },
      returning: true
    }
  );

  return {
    updated_count: updated[0],
    message: `${updated[0]} items marked as ${is_available ? 'available' : 'unavailable'}`
  };
}
