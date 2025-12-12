import sequelize from "../config/database.js";

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to database");

    // Add driver_rating column if missing
    await sequelize.query(`
      ALTER TABLE IF EXISTS orders
      ADD COLUMN IF NOT EXISTS driver_rating NUMERIC(2,1);
    `);

    console.log("Column driver_rating ensured on orders table");
  } catch (err) {
    console.error("Failed to add driver_rating column:", err);
    process.exitCode = 1;
  }
  await sequelize.close();
  process.exit();
})();
