import Restaurant from "./Restaurant.js";
import MenuItem from "./MenuItem.js";
import Addition from "./Addition.js";
import FoodCategory from "./FoodCategory.js";
import Client from "./Client.js";
import Order from "./Order.js";
import OrderItem from "./OrderItem.js";
import OrderItemAddition from "./OrderItemAddition.js";
import FavoriteMeal from "./FavoriteMeal.js";
import FavoriteRestaurant from "./FavoriteRestaurant.js";
import FavoriteAddress from "./FavoriteAddress.js";
import Driver from "./Driver.js";
import User from "./User.js";
import Admin from "./Admin.js";
import AdminNotification from "./AdminNotification.js";
import SystemConfig from "./SystemConfig.js";
import Cashier from "./Cashier.js";
import HomeCategory from "./HomeCategory.js";
import RestaurantHomeCategory from "./RestaurantHomeCategory.js";
import ThematicSelection from "./ThematicSelection.js";
import Promotion from "./Promotion.js";
import PromotionMenuItem from "./PromotionMenuItem.js";
import DailyDeal from "./DailyDeal.js";
import RecommendedDish from "./RecommendedDish.js";
import Announcement from "./Announcement.js";



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
// MenuItem & Additions
// ==========================
MenuItem.hasMany(Addition, {
  foreignKey: "menu_item_id",
  as: "additions",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

Addition.belongsTo(MenuItem, {
  foreignKey: "menu_item_id",
  as: "menu_item"
});

// ==========================
// OrderItem & OrderItemAdditions
// ==========================
OrderItem.hasMany(OrderItemAddition, {
  foreignKey: "order_item_id",
  as: "additions",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

OrderItemAddition.belongsTo(OrderItem, {
  foreignKey: "order_item_id",
  as: "order_item"
});

OrderItemAddition.belongsTo(Addition, {
  foreignKey: "addition_id",
  as: "addition"
});

Addition.hasMany(OrderItemAddition, {
  foreignKey: "addition_id",
  as: "order_item_additions",
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});

// ==========================
// Promotions & MenuItems
// ==========================
Promotion.belongsTo(Restaurant, {
  foreignKey: "restaurant_id",
  as: "restaurant"
});

Restaurant.hasMany(Promotion, {
  foreignKey: "restaurant_id",
  as: "promotions"
});

Promotion.belongsTo(MenuItem, {
  foreignKey: "menu_item_id",
  as: "menu_item"
});

MenuItem.hasMany(Promotion, {
  foreignKey: "menu_item_id",
  as: "primary_promotions"
});

Promotion.belongsToMany(MenuItem, {
  through: PromotionMenuItem,
  foreignKey: "promotion_id",
  otherKey: "menu_item_id",
  as: "menu_items"
});

MenuItem.belongsToMany(Promotion, {
  through: PromotionMenuItem,
  foreignKey: "menu_item_id",
  otherKey: "promotion_id",
  as: "promotions"
});

PromotionMenuItem.belongsTo(Promotion, {
  foreignKey: "promotion_id",
  as: "promotion"
});

PromotionMenuItem.belongsTo(MenuItem, {
  foreignKey: "menu_item_id",
  as: "menu_item"
});

Promotion.hasMany(PromotionMenuItem, {
  foreignKey: "promotion_id",
  as: "linked_menu_items"
});

MenuItem.hasMany(PromotionMenuItem, {
  foreignKey: "menu_item_id",
  as: "promotion_links"
});

Promotion.hasMany(DailyDeal, {
  foreignKey: "promotion_id",
  as: "daily_deals"
});

DailyDeal.belongsTo(Promotion, {
  foreignKey: "promotion_id",
  as: "promotion"
});

RecommendedDish.belongsTo(Restaurant, {
  foreignKey: "restaurant_id",
  as: "restaurant"
});

Restaurant.hasMany(RecommendedDish, {
  foreignKey: "restaurant_id",
  as: "recommended_dishes"
});

RecommendedDish.belongsTo(MenuItem, {
  foreignKey: "menu_item_id",
  as: "menu_item"
});

MenuItem.hasMany(RecommendedDish, {
  foreignKey: "menu_item_id",
  as: "recommended_entries"
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
// Favorite Addresses
// ==========================
Client.hasMany(FavoriteAddress, {
  foreignKey: "client_id",
  as: "favorite_addresses",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

FavoriteAddress.belongsTo(Client, {
  foreignKey: "client_id",
  as: "client",
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

Announcement.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  as: 'restaurant',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

Restaurant.hasMany(Announcement, {
  foreignKey: 'restaurant_id',
  as: 'announcements',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

HomeCategory.hasMany(ThematicSelection, {
  foreignKey: 'home_category_id',
  as: 'thematic_selections'
});

ThematicSelection.belongsTo(HomeCategory, {
  foreignKey: 'home_category_id',
  as: 'home_category'
});

Restaurant.belongsToMany(HomeCategory, {
  through: RestaurantHomeCategory,
  foreignKey: 'restaurant_id',
  otherKey: 'home_category_id',
  as: 'home_categories',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

HomeCategory.belongsToMany(Restaurant, {
  through: RestaurantHomeCategory,
  foreignKey: 'home_category_id',
  otherKey: 'restaurant_id',
  as: 'restaurants',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
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
// ✅ User <-> Cashier
User.hasOne(Cashier, {
  foreignKey: 'user_id',
  as: 'cashierProfile',
  onDelete: 'CASCADE'
});

Cashier.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// ✅ Restaurant <-> Cashier
Restaurant.hasMany(Cashier, {
  foreignKey: 'restaurant_id',
  as: 'cashiers',
  onDelete: 'CASCADE'
});

Cashier.belongsTo(Restaurant, {
  foreignKey: 'restaurant_id',
  as: 'restaurant'
});

// ✅ Cashier <-> Order (track who created the order)
Order.belongsTo(Cashier, {
  foreignKey: 'created_by_cashier_id',
  as: 'cashier',
  required: false
});

Cashier.hasMany(Order, {
  foreignKey: 'created_by_cashier_id',
  as: 'orders'
});

export { 
  Restaurant, 
  MenuItem, 
  Addition,
  FoodCategory, 
  Client, 
  Order, 
  OrderItem, 
  OrderItemAddition,
  FavoriteRestaurant,
  FavoriteAddress,
  FavoriteMeal, 
  Driver,
  User,
  Admin, 
  AdminNotification, 
  SystemConfig,
  Cashier,
  HomeCategory,
  RestaurantHomeCategory,
  ThematicSelection,
  Promotion,
  PromotionMenuItem,
  DailyDeal,
  RecommendedDish
};
