// seeders/seed.js
import { sequelize } from "../src/config/database.js";
import User from "../src/models/User.js";
import Client from "../src/models/Client.js";
import Driver from "../src/models/Driver.js";
import Restaurant from "../src/models/Restaurant.js";
import FoodCategory from "../src/models/FoodCategory.js";
import MenuItem from "../src/models/MenuItem.js";
import Order from "../src/models/Order.js";
import OrderItem from "../src/models/OrderItem.js";
import FavoriteRestaurant from "../src/models/FavoriteRestaurant.js";
import FavoriteMeal from "../src/models/FavoriteMeal.js";

// Import associations
import * as associations from "../src/models/index.js";

// Sample data arrays
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

const restaurantData = [
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
    { name: "Pizza Pepperoni", description: "Spicy pepperoni with extra cheese", price: 950, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500" },
    { name: "Pizza 4 Fromages", description: "Four cheese blend", price: 1000, image: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=500" },
    { name: "Pizza Végétarienne", description: "Fresh vegetables and olives", price: 900, image: "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=500" },
    { name: "Pizza Thon", description: "Tuna, onions, and olives", price: 920, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500" }
  ],
  burger: [
    { name: "Classic Burger", description: "Beef patty with lettuce, tomato", price: 650, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
    { name: "Cheeseburger", description: "Double cheese, special sauce", price: 750, image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=500" },
    { name: "Chicken Burger", description: "Crispy chicken fillet", price: 700, image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500" },
    { name: "Double Burger", description: "Two beef patties, bacon", price: 900, image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500" }
  ],
  tacos: [
    { name: "Tacos Poulet", description: "Chicken, fries, cheese sauce", price: 550, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500" },
    { name: "Tacos Viande", description: "Beef, fries, spicy sauce", price: 600, image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=500" },
    { name: "Tacos Mixte", description: "Chicken and beef combo", price: 650, image: "https://images.unsplash.com/photo-1599974579688-8dbdd335339f?w=500" },
    { name: "Tacos Escalope", description: "Breaded chicken, cheese", price: 580, image: "https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=500" }
  ],
  sandwish: [
    { name: "Sandwich Poulet", description: "Grilled chicken sandwich", price: 400, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500" },
    { name: "Sandwich Thon", description: "Tuna salad sandwich", price: 350, image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500" },
    { name: "Sandwich Chawarma", description: "Shawarma wrap", price: 500, image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500" },
    { name: "Sandwich Merguez", description: "Spicy sausage sandwich", price: 450, image: "https://images.unsplash.com/photo-1619530282882-5f4687f6cd83?w=500" }
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

// Helper function to generate random coordinates around Sidi Abdellah
const getRandomLocation = () => {
  const baseLat = 36.7129;
  const baseLng = 2.8461;
  const offset = 0.01; // ~1km radius
  
  return {
    type: 'Point',
    coordinates: [
      baseLng + (Math.random() - 0.5) * offset,
      baseLat + (Math.random() - 0.5) * offset
    ]
  };
};

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Sync database
    await sequelize.sync({ force: false });

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await sequelize.query('SET CONSTRAINTS ALL DEFERRED');
    await sequelize.truncate({ cascade: true, restartIdentity: true });

    // =====================================
    // 1. Create Multiple Clients (10)
    // =====================================
    console.log("👥 Creating 10 clients...");
    const clients = [];
    
    for (let i = 0; i < clientNames.length; i++) {
      const clientUser = await User.create({
        email: `client${i + 1}@example.com`,
        password: "password123",
        role: "client",
        is_active: true
      });

      const clientData = {
        user_id: clientUser.id,
        first_name: clientNames[i].first,
        last_name: clientNames[i].last,
        email: `client${i + 1}@example.com`,
        phone_number: `+21355512${String(i).padStart(4, '0')}`,
        address: `${addresses[i % addresses.length]}, Alger`,
        loyalty_points: Math.floor(Math.random() * 500),
        is_verified: Math.random() > 0.2,
        is_active: true,
        status: "active"
      };

      if (process.env.NODE_ENV !== "test") {
        clientData.location = getRandomLocation();
      }

      const client = await Client.create(clientData);
      clients.push(client);
    }

    // =====================================
    // 2. Create Multiple Drivers (7)
    // =====================================
    console.log("🚗 Creating 7 drivers...");
    const drivers = [];
    const vehicleTypes = ['motorcycle', 'car', 'scooter'];
    const statuses = ['available', 'available', 'available', 'busy', 'offline'];
    
    for (let i = 0; i < driverNames.length; i++) {
      const driverUser = await User.create({
        email: `driver${i + 1}@example.com`,
        password: "password123",
        role: "driver",
        is_active: true
      });

      const driverData = {
        user_id: driverUser.id,
        driver_code: `DRV-${String(i + 1).padStart(4, '0')}`,
        first_name: driverNames[i].first,
        last_name: driverNames[i].last,
        phone: `+21366623${String(i).padStart(4, '0')}`,
        email: `driver${i + 1}@example.com`,
        vehicle_type: vehicleTypes[i % vehicleTypes.length],
        vehicle_plate: `16-${10000 + i}-22`,
        license_number: `LIC${100000 + i}`,
        status: statuses[i % statuses.length],
        rating: (4.0 + Math.random() * 1).toFixed(1),
        total_deliveries: Math.floor(Math.random() * 500) + 50,
        is_verified: true,
        is_active: true
      };

      if (process.env.NODE_ENV !== "test") {
        driverData.current_location = getRandomLocation();
      }

      const driver = await Driver.create(driverData);
      drivers.push(driver);
    }

    // =====================================
    // 3. Create Multiple Restaurants (5)
    // =====================================
    console.log("🍽️  Creating 5 restaurants...");
    const restaurants = [];
    
    for (let i = 0; i < restaurantData.length; i++) {
      const restaurantUser = await User.create({
        email: `restaurant${i + 1}@example.com`,
        password: "password123",
        role: "restaurant",
        is_active: true
      });

      const restData = {
        user_id: restaurantUser.id,
        name: restaurantData[i].name,
        description: restaurantData[i].description,
        address: `${addresses[i]}, Alger`,
        rating: (3.5 + Math.random() * 1.5).toFixed(1),
        image_url: restaurantData[i].image,
        is_active: true,
        is_premium: Math.random() > 0.5,
        status: "approved",
        categories: restaurantData[i].categories,
        opening_hours: {
          mon: { open: 1000, close: 2200 },
          tue: { open: 1000, close: 2200 },
          wed: { open: 1000, close: 2200 },
          thu: { open: 1000, close: 2200 },
          fri: { open: 1000, close: 2300 },
          sat: { open: 1000, close: 2300 },
          sun: { open: 1100, close: 2200 }
        }
      };

      if (process.env.NODE_ENV !== "test") {
        restData.location = getRandomLocation();
      }

      const restaurant = await Restaurant.create(restData);
      restaurants.push(restaurant);
    }

    // =====================================
    // 4. Create Categories & Menu Items for Each Restaurant
    // =====================================
    console.log("🍕 Creating food categories and menu items...");
    const allMenuItems = [];
    
    for (const restaurant of restaurants) {
      for (const categoryType of restaurant.categories) {
        // Create category
        const category = await FoodCategory.create({
          restaurant_id: restaurant.id,
          nom: categoryType.charAt(0).toUpperCase() + categoryType.slice(1),
          description: `${restaurant.name}'s ${categoryType} selection`,
          icone_url: `https://images.unsplash.com/photo-${categoryType === 'pizza' ? '1513104890138' : categoryType === 'burger' ? '1568901346375' : categoryType === 'tacos' ? '1551504734' : '1528735602780'}-7c749659a591?w=200`,
          ordre_affichage: restaurant.categories.indexOf(categoryType) + 1
        });

        // Create menu items for this category
        const items = menuItemsByCategory[categoryType] || [];
        for (const item of items) {
          const menuItem = await MenuItem.create({
            category_id: category.id,
            nom: item.name,
            description: item.description,
            prix: item.price,
            photo_url: item.image,
            is_available: Math.random() > 0.1,
            temps_preparation: 15 + Math.floor(Math.random() * 20)
          });
          allMenuItems.push(menuItem);
        }
      }
    }

    // =====================================
    // 5. Create Favorites (Random)
    // =====================================
    console.log("⭐ Creating favorite restaurants and meals...");
    
    for (let i = 0; i < 15; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
      
      try {
        await FavoriteRestaurant.create({
          client_id: client.id,
          restaurant_id: restaurant.id,
          notes: ["Best pizza!", "Fast delivery", "Great food", "My favorite"][Math.floor(Math.random() * 4)],
          tags: ["fast", "tasty", "affordable"].slice(0, Math.floor(Math.random() * 3) + 1)
        });
      } catch (e) {
        // Ignore duplicates
      }
    }

    for (let i = 0; i < 20; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const meal = allMenuItems[Math.floor(Math.random() * allMenuItems.length)];
      
      try {
        await FavoriteMeal.create({
          client_id: client.id,
          meal_id: meal.id,
          customizations: ["Extra cheese", "No onions", "Spicy sauce", "Well done"][Math.floor(Math.random() * 4)],
          notes: "My go-to meal"
        });
      } catch (e) {
        // Ignore duplicates
      }
    }

    // =====================================
    // 6. Create Multiple Orders (30)
    // =====================================
    console.log("📦 Creating 30 orders...");
    const orderStatuses = ['pending', 'accepted', 'preparing', 'assigned', 'delivering', 'delivered', 'delivered', 'delivered'];
    const paymentMethods = ['cash_on_delivery', 'baridi_mob', 'bank_transfer'];
    
    for (let i = 0; i < 30; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
      const driver = drivers[Math.floor(Math.random() * drivers.length)];
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const orderType = Math.random() > 0.3 ? 'delivery' : 'pickup';
      
      const now = Date.now();
      const orderData = {
        client_id: client.id,
        restaurant_id: restaurant.id,
        order_type: orderType,
        delivery_address: client.address,
        status: status,
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        subtotal: 0, // Will be calculated from items
        delivery_fee: orderType === 'delivery' ? 200 : 0,
        total_amount: 0,
        livreur_id: orderType === 'delivery' && status !== 'pending' ? driver.id : null,
        delivery_instructions: ["Ring doorbell", "Call on arrival", "Leave at door"][Math.floor(Math.random() * 3)]
      };

      // Set timestamps based on status
      if (status !== 'pending') {
        orderData.accepted_at = new Date(now - 3600000);
      }
      if (['preparing', 'assigned', 'delivering', 'delivered'].includes(status)) {
        orderData.preparing_started_at = new Date(now - 3000000);
      }
      if (['assigned', 'delivering', 'delivered'].includes(status) && orderType === 'delivery') {
        orderData.assigned_at = new Date(now - 2400000);
      }
      if (['delivering', 'delivered'].includes(status) && orderType === 'delivery') {
        orderData.delivering_started_at = new Date(now - 1800000);
      }
      if (status === 'delivered') {
        orderData.delivered_at = new Date(now - 600000);
        if (Math.random() > 0.3) {
          orderData.rating = (3 + Math.random() * 2).toFixed(1);
          orderData.review_comment = ["Excellent!", "Great service", "Very good", "Perfect"][Math.floor(Math.random() * 4)];
        }
      }

      if (process.env.NODE_ENV !== "test") {
        orderData.delivery_location = getRandomLocation();
      }

      const order = await Order.create(orderData);

      // Create 1-4 order items
      const numItems = Math.floor(Math.random() * 3) + 1;
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const menuItem = allMenuItems[Math.floor(Math.random() * allMenuItems.length)];
        const quantity = Math.floor(Math.random() * 2) + 1;
        
        await OrderItem.create({
          order_id: order.id,
          menu_item_id: menuItem.id,
          quantite: quantity,
          prix_unitaire: menuItem.prix,
          instructions_speciales: Math.random() > 0.7 ? "Extra sauce" : null
        });

        subtotal += parseFloat(menuItem.prix) * quantity;
      }

      // Update order totals
      order.subtotal = subtotal;
      order.total_amount = subtotal + parseFloat(orderData.delivery_fee);
      await order.save();
    }

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\n📊 Seeded data summary:");
    console.log(`- ${clients.length} Clients`);
    console.log(`- ${drivers.length} Drivers`);
    console.log(`- ${restaurants.length} Restaurants`);
    console.log(`- ${allMenuItems.length} Menu items`);
    console.log("- 30 Orders with items");
    console.log("- Multiple favorites added");
    console.log("\n🔑 Login credentials:");
    console.log("Clients: client1@example.com to client10@example.com / password123");
    console.log("Drivers: driver1@example.com to driver7@example.com / password123");
    console.log("Restaurants: restaurant1@example.com to restaurant5@example.com / password123");
    console.log("\n📍 All locations set in Sidi Abdellah, Alger");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the seeder
seedDatabase();