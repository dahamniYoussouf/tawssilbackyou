// src/sync.js
import sequelize from "./config/database.js";
import "./models/Order.js";
import "./models/Restaurant.js";
import "./models/Client.js";
import "./models/RestaurantCategory.js";
import "./models/MenuItem.js";
import "./models/FoodCategory.js";
import "./models/OrderItem.js";


// import any other models you have (Livreur, Menu, etc.)

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // This will create the missing tables
    await sequelize.sync({ force: true }); 
    // Or { force: true } if you want to drop & recreate (⚠️ will delete data!)

    console.log("✅ Database synchronized");
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
})();
