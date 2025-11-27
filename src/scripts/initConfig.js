// src/scripts/initConfig.js
import { sequelize } from "../config/database.js";
import SystemConfig from "../models/SystemConfig.js";
import Driver from "../models/Driver.js";

const initializeConfiguration = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Liste complète des configurations par défaut
    const defaultConfigs = [
      {
        key: 'max_orders_per_driver',
        value: 5,
        description: 'Maximum number of orders a driver can handle simultaneously'
      },
      {
        key: 'max_distance_between_restaurants',
        value: 500,
        description: 'Maximum distance (in meters) between restaurants for multi-delivery'
      },
      {
        key: 'driver_search_radius',
        value: 5000,
        description: 'Default search radius (in meters) for finding nearby drivers'
      },
      {
        key: 'pending_order_timeout',
        value: 3,
        description: 'Time in minutes before notifying admin about pending order'
      },
      {
        key: 'default_delivery_fee',
        value: 200,
        description: 'Default delivery fee in DA'
      },
      {
        key: 'delivery_fee_per_km',
        value: 50,
        description: 'Additional delivery fee per kilometer in DA'
      },
      {
        key: 'max_delivery_distance',
        value: 15,
        description: 'Maximum delivery distance in kilometers'
      },
      {
        key: 'default_preparation_time',
        value: 15,
        description: 'Default order preparation time in minutes'
      },
      {
        key: 'platform_commission_rate',
        value: 15,
        description: 'Platform commission rate in percentage'
      },
      {
        key: 'max_driver_cancellations',
        value: 3,
        description: 'Maximum number of cancellations before driver notification'
      }
    ];

    // Créer ou mettre à jour toutes les configurations
    console.log("⚙️  Initializing system configurations...");
    for (const config of defaultConfigs) {
      const existing = await SystemConfig.findOne({ where: { config_key: config.key } });
      if (!existing) {
        await SystemConfig.set(
          config.key,
          config.value,
          null,
          config.description
        );
        console.log(`✅ Created config: ${config.key} = ${config.value}`);
      } else {
        console.log(`ℹ️  Config already exists: ${config.key} = ${existing.config_value}`);
      }
    }

    console.log(`✅ ${defaultConfigs.length} configurations initialized`);

    // Mettre à jour la capacité de tous les livreurs existants
    const maxOrders = await SystemConfig.get('max_orders_per_driver', 5);
    const driversUpdated = await Driver.update(
      { max_orders_capacity: maxOrders },
      { where: {} }
    );

    console.log(`✅ Updated ${driversUpdated[0]} drivers with max_orders_capacity = ${maxOrders}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  }
};

initializeConfiguration();