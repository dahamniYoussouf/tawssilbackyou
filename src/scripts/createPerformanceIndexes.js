import sequelize from "../config/database.js";

const statements = [
  `CREATE INDEX IF NOT EXISTS restaurants_location_gix ON restaurants USING GIST (location)`,
  `CREATE INDEX IF NOT EXISTS menu_items_restaurant_id_idx ON menu_items (restaurant_id)`,
  `CREATE INDEX IF NOT EXISTS menu_items_restaurant_available_created_idx ON menu_items (restaurant_id, is_available, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS restaurant_home_categories_restaurant_id_idx ON restaurant_home_categories (restaurant_id)`,
  `CREATE INDEX IF NOT EXISTS restaurant_home_categories_home_category_id_idx ON restaurant_home_categories (home_category_id)`,
  `CREATE INDEX IF NOT EXISTS food_categories_restaurant_id_idx ON food_categories (restaurant_id)`,
  `CREATE INDEX IF NOT EXISTS food_categories_restaurant_order_idx ON food_categories (restaurant_id, ordre_affichage)`
];

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    for (const sql of statements) {
      await sequelize.query(sql);
    }

    console.log("Performance indexes created/verified");
    process.exit(0);
  } catch (error) {
    console.error("Index creation failed:", error);
    process.exit(1);
  }
})();

