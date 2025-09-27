import Restaurant from "./Restaurant.js";
import MenuItem from "./MenuItem.js";
import FoodCategory from "./FoodCategory.js";
import Client from "./Client.js";
import Order from "./Order.js";

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


export { Restaurant, MenuItem, FoodCategory, Client, Order };
