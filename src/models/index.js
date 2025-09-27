import Restaurant from "./Restaurant.js";
import MenuItem from "./MenuItem.js";
import FoodCategory from "./FoodCategory.js";
import RestaurantCategory from "./RestaurantCategory.js";
import Client from "./Client.js";
import Order from "./Order.js";
import OrderItem from "./OrderItem.js";

// ==========================
// 🍽️ Restaurant & Menu Items
// ==========================
Restaurant.hasMany(MenuItem, {
  foreignKey: "restaurant_id",
  as: "menu_items",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

MenuItem.belongsTo(Restaurant, {
  foreignKey: "restaurant_id",
  as: "restaurant"
});

// ==========================
// 🥗 FoodCategory & Menu Items
// ==========================
FoodCategory.hasMany(MenuItem, {
  foreignKey: "category_id",
  as: "items",
  onDelete: "SET NULL",
  onUpdate: "CASCADE"
});

MenuItem.belongsTo(FoodCategory, {
  foreignKey: "category_id",
  as: "category"
});

// ==========================
// 🏪 RestaurantCategory & Restaurants
// ==========================
RestaurantCategory.hasMany(Restaurant, {
  foreignKey: "category_id",
  as: "restaurants",
  onDelete: "SET NULL",
  onUpdate: "CASCADE"
});

Restaurant.belongsTo(RestaurantCategory, {
  foreignKey: "category_id",
  as: "category"
});

// ==========================
// 👤 Client & Orders
// ==========================
Client.hasMany(Order, {
  foreignKey: "client_id",
  as: "orders",
  onDelete: "CASCADE",     // si un client est supprimé => commandes supprimées
  onUpdate: "CASCADE"
});

Order.belongsTo(Client, {
  foreignKey: "client_id",
  as: "client"
});

// ==========================
// 🍽️ Restaurant & Orders
// ==========================
Restaurant.hasMany(Order, {
  foreignKey: "restaurant_id",
  as: "orders",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Order.belongsTo(Restaurant, {
  foreignKey: "restaurant_id",
  as: "restaurant"
});

// ==========================
// 📦 Order & OrderItems
// ==========================
Order.hasMany(OrderItem, {
  foreignKey: "order_id",
  as: "order_items",
  onDelete: "CASCADE",     // si une commande est supprimée => articles supprimés
  onUpdate: "CASCADE"
});

OrderItem.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order"
});

// ==========================
// 🍕 MenuItem & OrderItems
// ==========================
MenuItem.hasMany(OrderItem, {
  foreignKey: "menu_item_id",
  as: "order_items",
  onDelete: "RESTRICT",    // empêche la suppression d'un menu item s'il y a des commandes
  onUpdate: "CASCADE"
});

OrderItem.belongsTo(MenuItem, {
  foreignKey: "menu_item_id",
  as: "menu_item"
});

export { Restaurant, MenuItem, FoodCategory, RestaurantCategory, Client, Order, OrderItem };