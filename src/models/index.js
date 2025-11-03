import Restaurant from "./Restaurant.js";
import MenuItem from "./MenuItem.js";
import FoodCategory from "./FoodCategory.js";
import Client from "./Client.js";
import Order from "./Order.js";
import OrderItem from "./OrderItem.js";
import FavoriteMeal from "./FavoriteMeal.js";
import FavoriteRestaurant from "./FavoriteRestaurant.js";
import Driver from "./Driver.js";
import User from "./User.js";
import Admin from "./Admin.js";
import AdminNotification from "./AdminNotification.js";
import SystemConfig from "./SystemConfig.js";



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

// ==========================
// ⭐ Client & Favorite Restaurants (Many-to-Many)
// ==========================
Client.belongsToMany(Restaurant, {
  through: FavoriteRestaurant,
  foreignKey: "client_id",
  otherKey: "restaurant_id",
  as: "favorite_restaurants"
});

Restaurant.belongsToMany(Client, {
  through: FavoriteRestaurant,
  foreignKey: "restaurant_id",
  otherKey: "client_id",
  as: "favorited_by_clients"
});

// Direct associations for easier queries
Client.hasMany(FavoriteRestaurant, {
  foreignKey: "client_id",
  as: "restaurant_favorites",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

FavoriteRestaurant.belongsTo(Client, {
  foreignKey: "client_id",
  as: "client"
});

FavoriteRestaurant.belongsTo(Restaurant, {
  foreignKey: "restaurant_id",
  as: "restaurant"
});

Restaurant.hasMany(FavoriteRestaurant, {
  foreignKey: "restaurant_id",
  as: "client_favorites",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

// ==========================
// ❤️ Restaurant & FoodCategory  (One-to-Many)
// ==========================
Restaurant.hasMany(FoodCategory, {
  foreignKey: 'restaurant_id',
  as: 'foodCategories',
  onDelete: 'CASCADE'
});

FoodCategory.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  as: 'restaurant'
});

// ==========================
// ❤️ Client & Favorite Meals (Many-to-Many)
// ==========================
Client.belongsToMany(MenuItem, {
  through: FavoriteMeal,
  foreignKey: "client_id",
  otherKey: "meal_id",
  as: "favorite_meals"
});

MenuItem.belongsToMany(Client, {
  through: FavoriteMeal,
  foreignKey: "meal_id",
  otherKey: "client_id",
  as: "favorited_by_clients"
});

// Direct associations for easier queries
Client.hasMany(FavoriteMeal, {
  foreignKey: "client_id",
  as: "meal_favorites",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

FavoriteMeal.belongsTo(Client, {
  foreignKey: "client_id",
  as: "client"
});

FavoriteMeal.belongsTo(MenuItem, {
  foreignKey: "meal_id",
  as: "meal"
});

MenuItem.hasMany(FavoriteMeal, {
  foreignKey: "meal_id",
  as: "client_favorites",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

// Order <-> Driver (for livreur_id)
Order.belongsTo(Driver, {
  foreignKey: 'livreur_id',
  as: 'driver'
});

Driver.hasMany(Order, {
  foreignKey: 'livreur_id',
  as: 'orders'
});



//User 

User.hasOne(Client, {
  foreignKey: 'user_id',
  as: 'clientProfile',
  onDelete: 'CASCADE'
});
Client.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasOne(Driver, {
  foreignKey: 'user_id',
  as: 'driverProfile',
  onDelete: 'CASCADE'
});
Driver.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasOne(Restaurant, {
  foreignKey: 'user_id',
  as: 'restaurantProfile',
  onDelete: 'CASCADE'
});
Restaurant.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});


// ✅ NEW: User <-> Admin
User.hasOne(Admin, {
  foreignKey: 'user_id',
  as: 'adminProfile',
  onDelete: 'CASCADE'
});
Admin.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// ✅ NEW: AdminNotification associations
AdminNotification.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
});
Order.hasMany(AdminNotification, {
  foreignKey: 'order_id',
  as: 'admin_notifications'
});

AdminNotification.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  as: 'restaurant'
});
Restaurant.hasMany(AdminNotification, {
  foreignKey: 'restaurant_id',
  as: 'admin_notifications'
});

AdminNotification.belongsTo(Admin, {
  foreignKey: 'resolved_by',
  as: 'resolver'
});
Admin.hasMany(AdminNotification, {
  foreignKey: 'resolved_by',
  as: 'resolved_notifications'
});

AdminNotification.belongsTo(Driver, {
  foreignKey: 'driver_id',
  as: 'driver'
});
Driver.hasMany(AdminNotification, {
  foreignKey: 'driver_id',
  as: 'admin_notifications'
});


// ==========================
// ⚙️ SystemConfig & Admin
// ==========================
SystemConfig.belongsTo(Admin, {
  foreignKey: 'updated_by',
  as: 'admin'
});

Admin.hasMany(SystemConfig, {
  foreignKey: 'updated_by',
  as: 'config_updates'
});


export { 
  Restaurant, 
  MenuItem, 
  FoodCategory, 
  Client, 
  Order, 
  OrderItem, 
  FavoriteRestaurant,
  FavoriteMeal, 
  Driver,
  User,
   Admin, 
  AdminNotification, 
  SystemConfig  
};

