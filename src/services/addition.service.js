import Addition from "../models/Addition.js";
import MenuItem from "../models/MenuItem.js";
import FoodCategory from "../models/FoodCategory.js";

// Ensure menu item belongs to restaurant
async function ensureMenuItemOwnership(menu_item_id, restaurant_id) {
  const menuItem = await MenuItem.findOne({
    where: { id: menu_item_id },
    include: [{
      model: FoodCategory,
      as: "category",
      attributes: ["restaurant_id"]
    }]
  });

  if (!menuItem) {
    throw { status: 404, message: "Menu item not found" };
  }

  if (restaurant_id && menuItem.category.restaurant_id !== restaurant_id) {
    throw { status: 403, message: "Menu item does not belong to your restaurant" };
  }

  return menuItem;
}

export async function createAddition(data, restaurant_id) {
  const { menu_item_id, nom, description, prix, is_available = true } = data;

  await ensureMenuItemOwnership(menu_item_id, restaurant_id);

  return await Addition.create({
    menu_item_id,
    nom,
    description,
    prix,
    is_available
  });
}

export async function updateAddition(id, updates, restaurant_id) {
  const addition = await Addition.findByPk(id, {
    include: [{
      model: MenuItem,
      as: "menu_item",
      include: [{
        model: FoodCategory,
        as: "category",
        attributes: ["restaurant_id"]
      }]
    }]
  });

  if (!addition) throw { status: 404, message: "Addition not found" };

  if (restaurant_id && addition.menu_item.category.restaurant_id !== restaurant_id) {
    throw { status: 403, message: "Addition does not belong to your restaurant" };
  }

  if (updates.menu_item_id && updates.menu_item_id !== addition.menu_item_id) {
    await ensureMenuItemOwnership(updates.menu_item_id, restaurant_id);
  }

  await addition.update(updates);
  return addition;
}

export async function deleteAddition(id, restaurant_id) {
  const addition = await Addition.findByPk(id, {
    include: [{
      model: MenuItem,
      as: "menu_item",
      include: [{
        model: FoodCategory,
        as: "category",
        attributes: ["restaurant_id"]
      }]
    }]
  });

  if (!addition) throw { status: 404, message: "Addition not found" };

  if (restaurant_id && addition.menu_item.category.restaurant_id !== restaurant_id) {
    throw { status: 403, message: "Addition does not belong to your restaurant" };
  }

  await addition.destroy();
  return { message: "Addition deleted successfully" };
}

export async function getAdditionsByMenuItem(menu_item_id, restaurant_id) {
  await ensureMenuItemOwnership(menu_item_id, restaurant_id);
  return await Addition.findAll({
    where: { menu_item_id },
    order: [["created_at", "DESC"]]
  });
}

export async function getAdditionById(id, restaurant_id) {
  const addition = await Addition.findByPk(id, {
    include: [{
      model: MenuItem,
      as: "menu_item",
      include: [{ model: FoodCategory, as: "category", attributes: ["restaurant_id"] }]
    }]
  });

  if (!addition) throw { status: 404, message: "Addition not found" };
  if (restaurant_id && addition.menu_item.category.restaurant_id !== restaurant_id) {
    throw { status: 403, message: "Addition does not belong to your restaurant" };
  }
  return addition;
}
