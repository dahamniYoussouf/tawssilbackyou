import { sequelize } from "../src/config/database.js";
import Restaurant from "../src/models/Restaurant.js";
import MenuItem from "../src/models/MenuItem.js";
import HomeCategory from "../src/models/HomeCategory.js";
import ThematicSelection from "../src/models/ThematicSelection.js";
import RecommendedDish from "../src/models/RecommendedDish.js";
import Promotion from "../src/models/Promotion.js";
import PromotionMenuItem from "../src/models/PromotionMenuItem.js";
import DailyDeal from "../src/models/DailyDeal.js";
import Announcement from "../src/models/Announcement.js";
import { seedHomepageModules } from "./homepageSeeder.js";

const buildRestaurantMenuMap = (menuItems) => {
  const map = new Map();
  menuItems.forEach((item) => {
    const list = map.get(item.restaurant_id) || [];
    list.push(item);
    map.set(item.restaurant_id, list);
  });
  return map;
};

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to the database, preparing homepage seed...");

    console.log("Cleaning up existing homepage modules...");
    const truncateCascade = (table) =>
      sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    await Promise.all([
      truncateCascade("promotion_menu_items"),
      truncateCascade("promotions"),
      truncateCascade("recommended_dishes"),
      truncateCascade("daily_deals"),
      truncateCascade("thematic_selections"),
      truncateCascade("home_categories"),
      truncateCascade("announcements")
    ]);

    const restaurants = await Restaurant.findAll({
      where: { is_active: true },
      order: [["created_at", "ASC"]]
    });

    if (!restaurants.length) {
      console.warn("No restaurants found. Seed aborted.");
      return;
    }

    const menuItems = await MenuItem.findAll({
      attributes: ["id", "restaurant_id"]
    });

    const restaurantMenuMap = buildRestaurantMenuMap(menuItems);

    await seedHomepageModules({
      restaurants,
      restaurantMenuMap
    });

    console.log("Homepage modules seeded successfully.");
  } catch (error) {
    console.error("Homepage seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

run();
