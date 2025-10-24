// seeders/seed.js
import { sequelize } from "../src/config/database.js";
import User from "../src/models/User.js";
import Client from "../src/models/Client.js";
import Driver from "../src/models/Driver.js";
import Restaurant from "../src/models/Restaurant.js";
import Admin from "../src/models/Admin.js";
import AdminNotification from "../src/models/AdminNotification.js";
import FoodCategory from "../src/models/FoodCategory.js";
import MenuItem from "../src/models/MenuItem.js";
import Order from "../src/models/Order.js";
import OrderItem from "../src/models/OrderItem.js";
import FavoriteRestaurant from "../src/models/FavoriteRestaurant.js";
import FavoriteMeal from "../src/models/FavoriteMeal.js";
import * as associations from "../src/models/index.js";
import bcrypt from "bcryptjs";

// ===============================
//   Données de base
// ===============================
const clientNames = [
  { first: "Ahmed", last: "Benali" },
  { first: "Fatima", last: "Mansouri" },
  { first: "Karim", last: "Bouteflika" },
  { first: "Samira", last: "Medjdoub" },
  { first: "Youcef", last: "Hamidi" },
  { first: "Amina", last: "Sadek" },
  { first: "Rachid", last: "Zerrouki" },
  { first: "Nawal", last: "Touati" },
  { first: "Omar", last: "Bouzid" },
  { first: "Leila", last: "Khelifi" }
];

const driverNames = [
  { first: "Mohamed", last: "Kaddour" },
  { first: "Sofiane", last: "Bellahcene" },
  { first: "Bilal", last: "Cherif" },
  { first: "Hichem", last: "Lahlou" },
  { first: "Amine", last: "Djebar" },
  { first: "Farid", last: "Mohand" },
  { first: "Walid", last: "Saidi" }
];

const adminNames = [
  { first: "Kamel", last: "Bensalah", role: "super_admin" },
  { first: "Sarah", last: "Boudiaf", role: "admin" },
  { first: "Riad", last: "Mahrez", role: "moderator" }
];

const restaurantModels = [
  {
    name: "Pizza Palace",
    description: "Authentic Italian pizza with Algerian twist",
    categories: ["pizza", "burger"],
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"
  },
  {
    name: "Tacos Express",
    description: "Best tacos in Alger with spicy sauce",
    categories: ["tacos"],
    image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800"
  },
  {
    name: "Burger King's",
    description: "Premium burgers and fries",
    categories: ["burger"],
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800"
  },
  {
    name: "Sandwich Corner",
    description: "Fresh sandwiches made daily",
    categories: ["sandwish"],
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800"
  },
  {
    name: "La Pizzeria",
    description: "Wood-fired pizzas and pasta",
    categories: ["pizza"],
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800"
  }
];

const menuItemsByCategory = {
  pizza: [
    { name: "Pizza Margherita", description: "Classic tomato, mozzarella, and basil", price: 850, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500" },
    { name: "Pizza Pepperoni", description: "Spicy pepperoni with extra cheese", price: 950, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500" }
  ],
  burger: [
    { name: "Classic Burger", description: "Beef patty with lettuce, tomato", price: 650, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
    { name: "Cheeseburger", description: "Double cheese, special sauce", price: 750, image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=500" }
  ],
  tacos: [
    { name: "Tacos Poulet", description: "Chicken, fries, cheese sauce", price: 550, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500" }
  ],
  sandwish: [
    { name: "Sandwich Poulet", description: "Grilled chicken sandwich", price: 400, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500" }
  ]
};

const addresses = [
  "Rue des Frères Bouadou, Sidi Abdellah",
  "Avenue de l'ALN, Sidi Abdellah",
  "Rue Mohamed Belouizdad, Sidi Abdellah",
  "Boulevard du 1er Novembre, Sidi Abdellah",
  "Rue Larbi Ben M'hidi, Sidi Abdellah",
  "Avenue Didouche Mourad, Sidi Abdellah",
  "Rue Hassiba Ben Bouali, Sidi Abdellah"
];

// Génère coordonnées aléatoires autour de Sidi Abdellah
const getRandomLocation = () => {
  const baseLat = 36.7129;
  const baseLng = 2.8461;
  const offset = 0.01;
  return {
    type: 'Point',
    coordinates: [
      baseLng + (Math.random() - 0.5) * offset,
      baseLat + (Math.random() - 0.5) * offset
    ]
  };
};

// ===============================
//   Fonction principale
// ===============================
const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    await sequelize.sync({ force: true });

    console.log("🗑️  Clearing existing data...");
    await sequelize.query('SET CONSTRAINTS ALL DEFERRED');
    await sequelize.truncate({ cascade: true, restartIdentity: true });

    // ✅ Hash password once
    const hashedPassword = await bcrypt.hash("password123", 10);

    // ----------------------------
    // 1️⃣ Admins
    // ----------------------------
    console.log("👨‍💼 Creating admins...");
    const admins = [];
    for (let i = 0; i < adminNames.length; i++) {
      const adminData = adminNames[i];
      const user = await User.create({
        email: `admin${i + 1}@example.com`,
        password: "password123",
        role: "admin",
        is_active: true
      });

      admins.push(await Admin.create({
        user_id: user.id,
        first_name: adminData.first,
        last_name: adminData.last,
        email: `admin${i + 1}@example.com`,
        phone: `+21377712${String(i).padStart(4, '0')}`,
        role_level: adminData.role,
        is_active: true
      }));
    }
    console.log(`✅ ${admins.length} admins created`);

    // ----------------------------
    // 2️⃣ Clients
    // ----------------------------
    console.log("👥 Creating clients...");
    const clientUsers = [];
    for (let i = 0; i < clientNames.length; i++) {
      clientUsers.push({
        email: `client${i + 1}@example.com`,
        password: hashedPassword,
        role: "client",
        is_active: true
      });
    }
    const usersCreated = await User.bulkCreate(clientUsers, { returning: true });
    const clients = [];
    for (let i = 0; i < usersCreated.length; i++) {
      const c = clientNames[i];
      clients.push(await Client.create({
        user_id: usersCreated[i].id,
        first_name: c.first,
        last_name: c.last,
        email: `client${i + 1}@example.com`,
        phone_number: `+21355512${String(i).padStart(4, '0')}`,
        address: `${addresses[i % addresses.length]}, Alger`,
        loyalty_points: Math.floor(Math.random() * 500),
        is_verified: Math.random() > 0.2,
        is_active: true,
        status: "active",
        location: getRandomLocation()
      }));
    }
    console.log(`✅ ${clients.length} clients created`);

    // ----------------------------
    // 3️⃣ Drivers
    // ----------------------------
    console.log("🚗 Creating drivers...");
    const drivers = [];
    for (let i = 0; i < driverNames.length; i++) {
      const user = await User.create({
        email: `driver${i + 1}@example.com`,
        password: "password123",
        role: "driver",
        is_active: true
      });
      const d = driverNames[i];
      drivers.push(await Driver.create({
        user_id: user.id,
        driver_code: `DRV-${String(i + 1).padStart(4, '0')}`,
        first_name: d.first,
        last_name: d.last,
        phone: `+21366623${String(i).padStart(4, '0')}`,
        email: `driver${i + 1}@example.com`,
        vehicle_type: ['motorcycle', 'car', 'scooter'][i % 3],
        vehicle_plate: `16-${10000 + i}-22`,
        license_number: `LIC${100000 + i}`,
        status: 'available',
        rating: (4.0 + Math.random()).toFixed(1),
        total_deliveries: Math.floor(Math.random() * 500) + 50,
        is_verified: true,
        is_active: true,
        current_location: getRandomLocation()
      }));
    }
    console.log(`✅ ${drivers.length} drivers created`);

    // ----------------------------
    // 4️⃣ Restaurants (1000)
    // ----------------------------
    console.log("🍽️  Creating 1000 restaurants...");
    const restaurantUsers = [];
    const restaurantList = [];

    for (let i = 0; i < 1000; i++) {
      restaurantUsers.push({
        email: `restaurant${i + 1}@example.com`,
        password: hashedPassword,
        role: "restaurant",
        is_active: true
      });
    }

    const createdUsers = await User.bulkCreate(restaurantUsers, { returning: true });

    for (let i = 0; i < 1000; i++) {
      const model = restaurantModels[i % restaurantModels.length];
      restaurantList.push({
        user_id: createdUsers[i].id,
        name: `${model.name} ${i + 1}`,
        description: model.description,
        address: `${addresses[i % addresses.length]}, Alger`,
        rating: (3.5 + Math.random() * 1.5).toFixed(1),
        image_url: model.image,
        is_active: true,
        is_premium: Math.random() > 0.5,
        status: "approved",
        categories: model.categories,
        opening_hours: {
          mon: { open: 1000, close: 2200 },
          tue: { open: 1000, close: 2200 },
          wed: { open: 1000, close: 2200 },
          thu: { open: 1000, close: 2200 },
          fri: { open: 1000, close: 2300 },
          sat: { open: 1000, close: 2300 },
          sun: { open: 1100, close: 2200 }
        },
        location: getRandomLocation()
      });
      if ((i + 1) % 100 === 0) console.log(`➡️  ${i + 1} restaurants créés...`);
    }

    const restaurants = await Restaurant.bulkCreate(restaurantList, { returning: true });
    console.log(`✅ ${restaurants.length} restaurants created`);

    // ----------------------------
    // 5️⃣ Catégories & Menus
    // ----------------------------
    console.log("🍕 Creating food categories and menu items...");
    const allMenuItems = [];

    for (const restaurant of restaurants.slice(0, 20)) {
      for (const categoryType of restaurant.categories) {
        const category = await FoodCategory.create({
          restaurant_id: restaurant.id,
          nom: categoryType,
          description: `${restaurant.name}'s ${categoryType} selection`,
          icone_url: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=200",
          ordre_affichage: 1
        });

        const items = menuItemsByCategory[categoryType] || [];
        for (const item of items) {
          allMenuItems.push(await MenuItem.create({
            category_id: category.id,
            nom: item.name,
            description: item.description,
            prix: item.price,
            photo_url: item.image,
            is_available: true,
            temps_preparation: 15 + Math.floor(Math.random() * 20)
          }));
        }
      }
    }
    console.log(`✅ ${allMenuItems.length} menu items created`);

    // ----------------------------
    // 6️⃣ Sample Orders (for testing notifications)
    // ----------------------------
    console.log("📦 Creating sample orders...");
    const sampleOrders = [];
    
    // Create 5 pending orders for admin notifications testing
    for (let i = 0; i < 5; i++) {
      const client = clients[i % clients.length];
      const restaurant = restaurants[i % 20];
      
      const order = await Order.create({
        client_id: client.id,
        restaurant_id: restaurant.id,
        order_type: 'delivery',
        delivery_address: client.address,
        delivery_location: client.location,
        subtotal: 1500 + (i * 200),
        delivery_fee: 200,
        total_amount: 1700 + (i * 200),
        payment_method: 'cash_on_delivery',
        status: 'pending',
        delivery_instructions: `Sample order ${i + 1}`
      });

      await order.generateOrderNumber();
      await order.save();
      
      sampleOrders.push(order);
    }
    console.log(`✅ ${sampleOrders.length} sample orders created`);

    // ----------------------------
    // 7️⃣ Admin Notifications
    // ----------------------------
    console.log("🔔 Creating admin notifications...");
    const notifications = [];

    // Create notifications for the pending orders
    for (let i = 0; i < 3; i++) {
      const order = sampleOrders[i];
      const restaurant = restaurants.find(r => r.id === order.restaurant_id);
      const client = clients.find(c => c.id === order.client_id);

      const notification = await AdminNotification.create({
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        type: 'pending_order_timeout',
        message: `⚠️ Commande #${order.order_number} sans réponse depuis 3 minutes.\n` +
                 `Restaurant: ${restaurant.name}\n` +
                 `Montant: ${order.total_amount} DA`,
        order_details: {
          order_number: order.order_number,
          order_type: order.order_type,
          total_amount: parseFloat(order.total_amount),
          delivery_address: order.delivery_address,
          created_at: order.created_at,
          client: {
            name: `${client.first_name} ${client.last_name}`,
            phone: client.phone_number,
            address: client.address
          }
        },
        restaurant_info: {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          phone: 'Non renseigné',
          email: `restaurant${i + 1}@example.com`
        },
        is_read: i === 0, // First one is read
        is_resolved: false
      });

      notifications.push(notification);
    }
    console.log(`✅ ${notifications.length} admin notifications created`);

    // ----------------------------
    // 📊 Résumé final
    // ----------------------------
    console.log("\n📊 Résumé :");
    console.log(`- ${admins.length} admins (super_admin, admin, moderator)`);
    console.log(`- ${clients.length} clients`);
    console.log(`- ${drivers.length} livreurs`);
    console.log(`- ${restaurants.length} restaurants`);
    console.log(`- ${allMenuItems.length} items de menu`);
    console.log(`- ${sampleOrders.length} sample orders`);
    console.log(`- ${notifications.length} admin notifications`);
    
    console.log("\n🔑 Identifiants :");
    console.log("Admins:");
    console.log("  - admin1@example.com (Super Admin) / password123");
    console.log("  - admin2@example.com (Admin) / password123");
    console.log("  - admin3@example.com (Moderator) / password123");
    console.log("Restaurants: restaurant1@example.com → restaurant1000@example.com / password123");
    console.log("Drivers: driver1@example.com → driver7@example.com / password123");

  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await sequelize.close();
  }
};

seedDatabase();