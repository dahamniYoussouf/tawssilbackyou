// seeders/seed.js
import { sequelize } from "../src/config/database.js";
import User from "../src/models/User.js";
import Client from "../src/models/Client.js";
import Driver from "../src/models/Driver.js";
import Restaurant from "../src/models/Restaurant.js";
import Admin from "../src/models/Admin.js";
import AdminNotification from "../src/models/AdminNotification.js";
import SystemConfig from "../src/models/SystemConfig.js"; 
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
const firstNames = [
  "Ahmed", "Mohamed", "Fatima", "Karim", "Samira", "Youcef", "Amina", "Rachid", 
  "Nawal", "Omar", "Leila", "Sofiane", "Bilal", "Hichem", "Amine", "Farid",
  "Walid", "Kamel", "Sarah", "Riad", "Yasmine", "Hamza", "Imane", "Mehdi",
  "Salima", "Tarek", "Nadia", "Djamel", "Karima", "Malik"
];

const lastNames = [
  "Benali", "Mansouri", "Bouteflika", "Medjdoub", "Hamidi", "Sadek", "Zerrouki",
  "Touati", "Bouzid", "Khelifi", "Kaddour", "Bellahcene", "Cherif", "Lahlou",
  "Djebar", "Mohand", "Saidi", "Bensalah", "Boudiaf", "Mahrez", "Benaissa",
  "Rahmani", "Taleb", "Bencheikh", "Ouali", "Sahli", "Boualem", "Ferhat"
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
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a513?w=800"
  }
];

const menuItemsByCategory = {
  pizza: [
    { name: "Pizza Margherita", description: "Classic tomato, mozzarella, and basil", price: 850, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500" },
    { name: "Pizza Pepperoni", description: "Spicy pepperoni with extra cheese", price: 950, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500" },
    { name: "Pizza Quattro Formaggi", description: "Four cheese pizza", price: 1050, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500" }
  ],
  burger: [
    { name: "Classic Burger", description: "Beef patty with lettuce, tomato", price: 650, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
    { name: "Cheeseburger", description: "Double cheese, special sauce", price: 750, image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=500" },
    { name: "Chicken Burger", description: "Crispy chicken with mayo", price: 700, image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500" }
  ],
  tacos: [
    { name: "Tacos Poulet", description: "Chicken, fries, cheese sauce", price: 550, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500" },
    { name: "Tacos Viande", description: "Beef, fries, spicy sauce", price: 600, image: "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=500" }
  ],
  sandwish: [
    { name: "Sandwich Poulet", description: "Grilled chicken sandwich", price: 400, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500" },
    { name: "Sandwich Thon", description: "Tuna with vegetables", price: 350, image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500" }
  ]
};

const streets = [
  "Rue des Frères Bouadou", "Avenue de l'ALN", "Rue Mohamed Belouizdad",
  "Boulevard du 1er Novembre", "Rue Larbi Ben M'hidi", "Avenue Didouche Mourad",
  "Rue Hassiba Ben Bouali", "Rue Abane Ramdane", "Avenue Souidani Boudjemaa",
  "Rue Amirouche", "Boulevard Zighoud Youcef", "Rue Colonel Lotfi"
];

const vehicleTypes = ['motorcycle', 'bicycle', 'scooter'];
const orderStatuses = ['pending', 'accepted', 'preparing', 'assigned', 'delivering', 'delivered', 'declined'];
const paymentMethods = ['baridi_mob', 'cash_on_delivery', 'bank_transfer'];

// Génère coordonnées aléatoires autour de Sidi Abdellah
const getRandomLocation = () => {
  const baseLat = 36.747385;
  const baseLng = 6.27404;
  const offset = 0.02;
  return {
    type: 'Point',
    coordinates: [
      baseLng + (Math.random() - 0.5) * offset,
      baseLat + (Math.random() - 0.5) * offset
    ]
  };
};

// Génère un nom aléatoire
const getRandomName = () => ({
  first: firstNames[Math.floor(Math.random() * firstNames.length)],
  last: lastNames[Math.floor(Math.random() * lastNames.length)]
});

// Génère une adresse aléatoire
const getRandomAddress = () => {
  const street = streets[Math.floor(Math.random() * streets.length)];
  const number = Math.floor(Math.random() * 200) + 1;
  return `${number} ${street}, Sidi Abdellah, Alger`;
};

// ✅ FONCTION CORRIGÉE - Génère un numéro de téléphone UNIQUE
const getUniquePhone = (prefix, index) => {
  // Prendre les 6 derniers chiffres de (1000000 + index)
  const baseNumber = 1000000 + index;
  const lastSixDigits = String(baseNumber).slice(-6);
  return `+213${prefix}${lastSixDigits}`;
};

// ===============================
//   Fonction principale
// ===============================
const seedDatabase = async () => {
  try {
    console.log("🌱 Starting massive database seeding...");

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
        phone: getUniquePhone("777", i), // ✅ CORRIGÉ
        role_level: adminData.role,
        is_active: true
      }));
    }
    console.log(`✅ ${admins.length} admins created`);

    // ----------------------------
    // 🆕 SYSTEM CONFIGURATIONS (COMPLETE)
    // ----------------------------
    console.log("⚙️  Initializing system configurations...");
    
    await SystemConfig.create({
      config_key: 'max_orders_per_driver',
      config_value: 5,
      description: 'Maximum number of orders a driver can handle simultaneously',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'max_distance_between_restaurants',
      config_value: 500,
      description: 'Maximum distance (in meters) between restaurants for multi-delivery',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'driver_search_radius',
      config_value: 5000,
      description: 'Default search radius (in meters) for finding nearby drivers',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'pending_order_timeout',
      config_value: 3,
      description: 'Time in minutes before notifying admin about pending order',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'default_delivery_fee',
      config_value: 200,
      description: 'Default delivery fee in DA',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'delivery_fee_per_km',
      config_value: 50,
      description: 'Additional delivery fee per kilometer in DA',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'max_delivery_distance',
      config_value: 15,
      description: 'Maximum delivery distance in kilometers',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'default_preparation_time',
      config_value: 15,
      description: 'Default order preparation time in minutes',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'platform_commission_rate',
      config_value: 15,
      description: 'Platform commission rate in percentage',
      updated_by: admins[0].id
    });
    
    await SystemConfig.create({
      config_key: 'max_driver_cancellations',
      config_value: 3,
      description: 'Maximum number of cancellations before driver notification',
      updated_by: admins[0].id
    });
    
    console.log("✅ 10 system configurations initialized");

    // ----------------------------
    // 2️⃣ Clients (1000)
    // ----------------------------
    console.log("👥 Creating 1000 clients...");
    const clientUsers = [];
    for (let i = 0; i < 1000; i++) {
      clientUsers.push({
        email: `client${i + 1}@example.com`,
        password: hashedPassword,
        role: "client",
        is_active: true,
        last_login: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
      
      if ((i + 1) % 200 === 0) console.log(`➡️  ${i + 1} client users created...`);
    }
    const clientUsersCreated = await User.bulkCreate(clientUsers, { returning: true });
    
    const clients = [];
    for (let i = 0; i < 1000; i++) {
      const name = getRandomName();
      const location = getRandomLocation();
      
      clients.push({
        user_id: clientUsersCreated[i].id,
        first_name: name.first,
        last_name: name.last,
        email: `client${i + 1}@example.com`,
        phone_number: getUniquePhone("555", i), // ✅ CORRIGÉ
        address: getRandomAddress(),
        location: location,
        profile_image_url: `https://i.pravatar.cc/150?img=${i + 1}`,
        loyalty_points: Math.floor(Math.random() * 1000),
        is_verified: Math.random() > 0.1,
        is_active: Math.random() > 0.05,
        status: Math.random() > 0.9 ? "suspended" : "active"
      });
      
      if ((i + 1) % 200 === 0) console.log(`➡️  ${i + 1} clients created...`);
    }
    
    const createdClients = await Client.bulkCreate(clients, { returning: true });
    console.log(`✅ ${createdClients.length} clients created`);

    // ----------------------------
    // 3️⃣ Drivers (1000)
    // ----------------------------
    console.log("🚗 Creating 1000 drivers...");
    const driverUsers = [];
    for (let i = 0; i < 1000; i++) {
      driverUsers.push({
        email: `driver${i + 1}@example.com`,
        password: hashedPassword,
        role: "driver",
        is_active: true,
        last_login: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
      
      if ((i + 1) % 200 === 0) console.log(`➡️  ${i + 1} driver users created...`);
    }
    const driverUsersCreated = await User.bulkCreate(driverUsers, { returning: true });
    
    const drivers = [];
    const statuses = ['available', 'busy', 'offline'];
    
    for (let i = 0; i < 1000; i++) {
      const name = getRandomName();
      const location = getRandomLocation();
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      drivers.push({
        user_id: driverUsersCreated[i].id,
        driver_code: `DRV-${String(i + 1).padStart(4, '0')}`,
        first_name: name.first,
        last_name: name.last,
        profile_image_url: `https://i.pravatar.cc/150?img=${i + 1}`,
        phone: getUniquePhone("666", i), // ✅ CORRIGÉ
        email: `driver${i + 1}@example.com`,
        vehicle_type: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
        vehicle_plate: `${Math.floor(Math.random() * 48) + 1}-${10000 + i}-${Math.floor(Math.random() * 99) + 1}`,
        license_number: `LIC${100000 + i}`,
        status: status,
        current_location: location,
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        total_deliveries: Math.floor(Math.random() * 1000) + 10,
        is_verified: Math.random() > 0.05,
        is_active: Math.random() > 0.05,
        last_active_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        max_orders_capacity: 5,
        active_orders: [],
        cancellation_count: Math.floor(Math.random() * 5),
        notes: i % 10 === 0 ? `Excellent driver, very punctual` : null
      });
      
      if ((i + 1) % 200 === 0) console.log(`➡️  ${i + 1} drivers created...`);
    }
    
    const createdDrivers = await Driver.bulkCreate(drivers, { returning: true });
    console.log(`✅ ${createdDrivers.length} drivers created (capacity: 5 orders each)`);

    // ----------------------------
    // 4️⃣ Restaurants (1000)
    // ----------------------------
    console.log("🍽️  Creating 1000 restaurants...");
    const restaurantUsers = [];
    for (let i = 0; i < 1000; i++) {
      restaurantUsers.push({
        email: `restaurant${i + 1}@example.com`,
        password: hashedPassword,
        role: "restaurant",
        is_active: true
      });
      
      if ((i + 1) % 200 === 0) console.log(`➡️  ${i + 1} restaurant users created...`);
    }

    const restaurantUsersCreated = await User.bulkCreate(restaurantUsers, { returning: true });

    const restaurantList = [];
    for (let i = 0; i < 1000; i++) {
      const model = restaurantModels[i % restaurantModels.length];
      const location = getRandomLocation();
      
      restaurantList.push({
        user_id: restaurantUsersCreated[i].id,
        name: `${model.name} ${i + 1}`,
        description: model.description,
        address: getRandomAddress(),
        phone_number: getUniquePhone("770", i), // ✅ CORRIGÉ
        email: `restaurant${i + 1}@example.com`,
        location: location,
        rating: parseFloat((3.0 + Math.random() * 2.0).toFixed(1)),
        image_url: model.image,
        is_active: Math.random() > 0.1,
        is_premium: Math.random() > 0.7,
        status: Math.random() > 0.9 ? "suspended" : "approved",
        categories: model.categories,
        opening_hours: {
          mon: { open: 1000, close: 2200 },
          tue: { open: 1000, close: 2200 },
          wed: { open: 1000, close: 2200 },
          thu: { open: 1000, close: 2200 },
          fri: { open: 1000, close: 2300 },
          sat: { open: 1000, close: 2300 },
          sun: { open: 1100, close: 2200 }
        }
      });
      
      if ((i + 1) % 200 === 0) console.log(`➡️  ${i + 1} restaurants created...`);
    }

    const restaurants = await Restaurant.bulkCreate(restaurantList, { returning: true });
    console.log(`✅ ${restaurants.length} restaurants created`);

    // ----------------------------
    // 5️⃣ Catégories & Menus (pour les 100 premiers restaurants)
    // ----------------------------
    console.log("🍕 Creating food categories and menu items...");
    const allMenuItems = [];

    for (let i = 0; i < 100; i++) {
      const restaurant = restaurants[i];
      
      for (const categoryType of restaurant.categories) {
        const category = await FoodCategory.create({
          restaurant_id: restaurant.id,
          nom: categoryType.charAt(0).toUpperCase() + categoryType.slice(1),
          description: `${restaurant.name}'s ${categoryType} selection`,
          icone_url: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=200",
          ordre_affichage: restaurant.categories.indexOf(categoryType) + 1
        });

        const items = menuItemsByCategory[categoryType] || [];
        for (const item of items) {
          const menuItem = await MenuItem.create({
            category_id: category.id,
            nom: item.name,
            description: item.description,
            prix: item.price + (Math.random() * 200 - 100),
            photo_url: item.image,
            is_available: Math.random() > 0.1,
            temps_preparation: 10 + Math.floor(Math.random() * 30)
          });
          allMenuItems.push(menuItem);
        }
      }
      
      if ((i + 1) % 20 === 0) console.log(`➡️  ${i + 1} restaurants with menus created...`);
    }
    console.log(`✅ ${allMenuItems.length} menu items created`);

    // ----------------------------
    // 6️⃣ Orders (1000)
    // ----------------------------
    console.log("📦 Creating 1000 orders...");
    const orders = [];
    
    for (let i = 0; i < 1000; i++) {
      const client = createdClients[i % createdClients.length];
      const restaurant = restaurants[i % 100];
      const driver = i % 3 === 0 ? createdDrivers[i % createdDrivers.length] : null;
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const orderType = Math.random() > 0.2 ? 'delivery' : 'pickup';
      
      const subtotal = 800 + Math.floor(Math.random() * 2000);
      const deliveryFee = orderType === 'delivery' ? 150 + Math.floor(Math.random() * 150) : 0;
      const totalAmount = subtotal + deliveryFee;
      
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      let acceptedAt = null;
      let preparingStartedAt = null;
      let assignedAt = null;
      let deliveringStartedAt = null;
      let deliveredAt = null;
      
      if (['accepted', 'preparing', 'assigned', 'delivering', 'delivered'].includes(status)) {
        acceptedAt = new Date(createdAt.getTime() + 5 * 60 * 1000);
      }
      if (['preparing', 'assigned', 'delivering', 'delivered'].includes(status)) {
        preparingStartedAt = new Date(acceptedAt.getTime() + 1 * 60 * 1000);
      }
      if (['assigned', 'delivering', 'delivered'].includes(status)) {
        assignedAt = new Date(preparingStartedAt.getTime() + 15 * 60 * 1000);
      }
      if (['delivering', 'delivered'].includes(status)) {
        deliveringStartedAt = new Date(assignedAt.getTime() + 10 * 60 * 1000);
      }
      if (status === 'delivered') {
        deliveredAt = new Date(deliveringStartedAt.getTime() + 20 * 60 * 1000);
      }
      
      const order = {
        client_id: client.id,
        restaurant_id: restaurant.id,
        livreur_id: driver ? driver.id : null,
        order_type: orderType,
        order_number: `${orderType === 'pickup' ? 'PKP' : 'DEL'}-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
        status: status,
        delivery_address: orderType === 'delivery' ? client.address : null,
        delivery_location: orderType === 'delivery' ? client.location : null,
        delivery_distance: orderType === 'delivery' ? parseFloat((Math.random() * 10 + 1).toFixed(2)) : null,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        delivery_instructions: i % 5 === 0 ? "Please call when you arrive" : null,
        preparation_time: 15 + Math.floor(Math.random() * 20),
        estimated_delivery_time: new Date(createdAt.getTime() + (30 + Math.random() * 30) * 60 * 1000),
        rating: status === 'delivered' && Math.random() > 0.3 ? parseFloat((3 + Math.random() * 2).toFixed(1)) : null,
        review_comment: status === 'delivered' && Math.random() > 0.7 ? "Great food and fast delivery!" : null,
        decline_reason: status === 'declined' ? "Restaurant is too busy" : null,
        created_at: createdAt,
        updated_at: deliveredAt || deliveringStartedAt || assignedAt || preparingStartedAt || acceptedAt || createdAt,
        accepted_at: acceptedAt,
        preparing_started_at: preparingStartedAt,
        assigned_at: assignedAt,
        delivering_started_at: deliveringStartedAt,
        delivered_at: deliveredAt
      };
      
      orders.push(order);
      
      if ((i + 1) % 200 === 0) console.log(`➡️  ${i + 1} orders prepared...`);
    }
    
    const createdOrders = await Order.bulkCreate(orders, { returning: true });
    console.log(`✅ ${createdOrders.length} orders created`);

    // ----------------------------
    // 7️⃣ Order Items
    // ----------------------------
    console.log("🍕 Creating order items...");
    const orderItems = [];
    
    for (let i = 0; i < createdOrders.length; i++) {
      const order = createdOrders[i];
      const restaurant = restaurants.find(r => r.id === order.restaurant_id);
      
      const restaurantCategories = await FoodCategory.findAll({
        where: { restaurant_id: restaurant.id }
      });
      
      if (restaurantCategories.length > 0) {
        const restaurantMenuItems = await MenuItem.findAll({
          where: { category_id: restaurantCategories.map(c => c.id) }
        });
        
        if (restaurantMenuItems.length > 0) {
          const itemCount = Math.floor(Math.random() * 3) + 1;
          
          for (let j = 0; j < itemCount; j++) {
            const menuItem = restaurantMenuItems[Math.floor(Math.random() * restaurantMenuItems.length)];
            const quantity = Math.floor(Math.random() * 3) + 1;
            const unitPrice = parseFloat(menuItem.prix);
            const totalPrice = unitPrice * quantity;
            
            orderItems.push({
              order_id: order.id,
              menu_item_id: menuItem.id,
              quantite: quantity,
              prix_unitaire: unitPrice,
              prix_total: totalPrice,
              instructions_speciales: j === 0 && Math.random() > 0.7 ? "Extra sauce please" : null
            });
          }
        }
      }
      
      if ((i + 1) % 200 === 0) console.log(`➡️  Order items for ${i + 1} orders created...`);
    }
    
    await OrderItem.bulkCreate(orderItems);
    console.log(`✅ ${orderItems.length} order items created`);

    // ----------------------------
    // 8️⃣ Favorites (Sample)
    // ----------------------------
    console.log("⭐ Creating favorite restaurants and meals...");
    
    const favoriteRestaurants = [];
    const favoriteMeals = [];
    
    for (let i = 0; i < 100; i++) {
      const client = createdClients[i];
      const favCount = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < favCount; j++) {
        const restaurant = restaurants[Math.floor(Math.random() * 100)];
        
        favoriteRestaurants.push({
          client_id: client.id,
          restaurant_id: restaurant.id,
          notes: j === 0 ? "Best pizza in town!" : null,
          tags: j % 2 === 0 ? ["favorite", "quick"] : []
        });
      }
    }
    
    await FavoriteRestaurant.bulkCreate(favoriteRestaurants, { ignoreDuplicates: true });
    console.log(`✅ ${favoriteRestaurants.length} favorite restaurants created`);
    
    for (let i = 0; i < 100; i++) {
      const client = createdClients[i];
      const favCount = Math.floor(Math.random() * 10) + 1;
      
      for (let j = 0; j < favCount; j++) {
        if (allMenuItems.length > 0) {
          const menuItem = allMenuItems[Math.floor(Math.random() * allMenuItems.length)];
          
          favoriteMeals.push({
            client_id: client.id,
            meal_id: menuItem.id,
            customizations: j % 3 === 0 ? "Extra cheese, no onions" : null,
            notes: j % 2 === 0 ? "My favorite!" : null
          });
        }
      }
    }
    
    await FavoriteMeal.bulkCreate(favoriteMeals, { ignoreDuplicates: true });
    console.log(`✅ ${favoriteMeals.length} favorite meals created`);

    // ----------------------------
    // 9️⃣ Admin Notifications
    // ----------------------------
    console.log("🔔 Creating admin notifications...");
    const notifications = [];

    const pendingOrders = createdOrders.filter(o => o.status === 'pending').slice(0, 10);
    
    for (const order of pendingOrders) {
      const restaurant = restaurants.find(r => r.id === order.restaurant_id);
      const client = createdClients.find(c => c.id === order.client_id);

      notifications.push({
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
          phone: restaurant.phone_number
        },
        is_read: Math.random() > 0.5,
        is_resolved: false
      });
    }
    
    await AdminNotification.bulkCreate(notifications);
    console.log(`✅ ${notifications.length} admin notifications created`);

    // ----------------------------
    // 📊 Résumé final
    // ----------------------------
    console.log("\n" + "=".repeat(60));
    console.log("📊 DATABASE SEEDING COMPLETE");
    console.log("=".repeat(60));
    console.log(`✅ ${admins.length} admins`);
    console.log(`✅ ${createdClients.length} clients`);
    console.log(`✅ ${createdDrivers.length} drivers (capacity: 5 orders each)`);
    console.log(`✅ ${restaurants.length} restaurants`);
    console.log(`✅ ${allMenuItems.length} menu items`);
    console.log(`✅ ${createdOrders.length} orders`);
    console.log(`✅ ${orderItems.length} order items`);
    console.log(`✅ ${favoriteRestaurants.length} favorite restaurants`);
    console.log(`✅ ${favoriteMeals.length} favorite meals`);
    console.log(`✅ ${notifications.length} admin notifications`);
    console.log(`✅ 10 system configurations`);
    
    console.log("\n⚙️  SYSTEM CONFIGURATIONS:");
    console.log("─".repeat(60));
    console.log("✓ max_orders_per_driver: 5");
    console.log("✓ max_distance_between_restaurants: 500m");
    console.log("✓ driver_search_radius: 5000m");
    console.log("✓ pending_order_timeout: 3 minutes");
    console.log("✓ default_delivery_fee: 200 DA");
    console.log("✓ delivery_fee_per_km: 50 DA");
    console.log("✓ max_delivery_distance: 15 km");
    console.log("✓ default_preparation_time: 15 minutes");
    console.log("✓ platform_commission_rate: 15%");
    console.log("✓ max_driver_cancellations: 3");
    console.log("─".repeat(60));
    
    console.log("\n🔑 LOGIN CREDENTIALS:");
    console.log("─".repeat(60));
    console.log("ADMINS:");
    console.log("  • admin1@example.com (Super Admin) / password123");
    console.log("  • admin2@example.com (Admin) / password123");
    console.log("  • admin3@example.com (Moderator) / password123");
    console.log("\nCLIENTS:");
    console.log("  • client1@example.com → client1000@example.com / password123");
    console.log("\nDRIVERS:");
    console.log("  • driver1@example.com → driver1000@example.com / password123");
    console.log("\nRESTAURANTS:");
    console.log("  • restaurant1@example.com → restaurant1000@example.com / password123");
    console.log("─".repeat(60));
    
    console.log("\n✅ System ready for testing!");
    console.log("🚀 Multi-delivery features enabled");
    console.log("📱 Ready for production load testing");
    console.log("🔧 Admins can modify all configs via API endpoints");

  } catch (err) {
    console.error("❌ Seeding failed:", err);
    console.error(err.stack);
  } finally {
    await sequelize.close();
    console.log("\n👋 Database connection closed");
  }
};

seedDatabase();