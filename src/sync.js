// src/sync.js
import sequelize from "./config/database.js";
import "./models/Order.js";
import "./models/Restaurant.js";
import "./models/Client.js";
import "./models/MenuItem.js";
import "./models/Addition.js";
import "./models/FoodCategory.js";
import "./models/OrderItem.js";
import "./models/OrderItemAddition.js";
import "./models/FavoriteMeal.js";
import "./models/FavoriteRestaurant.js";
import "./models/FavoriteAddress.js";
import "./models/Announcement.js";
import "./models/HomeCategory.js";
import "./models/ThematicSelection.js";
import "./models/RecommendedDish.js";
import "./models/Promotion.js";
import "./models/PromotionMenuItem.js";
import "./models/DailyDeal.js";
import "./models/Driver.js";
import "./models/User.js";
import "./models/Admin.js";
import "./models/AdminNotification.js";
import "./models/SystemConfig.js";
import "./models/Cashier.js";



// Import associations
import "./models/index.js";

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