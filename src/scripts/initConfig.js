// src/scripts/initConfig.js
import { sequelize } from "../config/database.js";
import SystemConfig from "../models/SystemConfig.js";
import Driver from "../models/Driver.js";

const initializeConfiguration = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Créer les configurations par défaut
    await SystemConfig.set(
      'max_orders_per_driver',
      5,
      null,
      'Maximum number of orders a driver can handle simultaneously'
    );

    await SystemConfig.set(
      'max_distance_between_restaurants',
      500,
      null,
      'Maximum distance (in meters) between restaurants for multi-delivery'
    );

    console.log("✅ Default configurations created");

    // Mettre à jour la capacité de tous les livreurs existants
    const driversUpdated = await Driver.update(
      { max_orders_capacity: 5 },
      { where: {} }
    );

    console.log(`✅ Updated ${driversUpdated[0]} drivers with max_orders_capacity = 5`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  }
};

initializeConfiguration();