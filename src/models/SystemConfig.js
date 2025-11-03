import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const SystemConfig = sequelize.define('SystemConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)"
  },
  config_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: "Configuration key (e.g., 'max_orders_per_driver')"
  },
  config_value: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: "Configuration value (can be any JSON)"
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Description of the configuration"
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'admins',
      key: 'id'
    },
    comment: "Admin who last updated this config"
  }
}, {
  tableName: 'system_configs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['config_key']
    }
  ]
});

// Helper methods
SystemConfig.get = async function(key, defaultValue = null) {
  const config = await this.findOne({ where: { config_key: key } });
  return config ? config.config_value : defaultValue;
};

SystemConfig.set = async function(key, value, adminId = null, description = null) {
  const [config, created] = await this.findOrCreate({
    where: { config_key: key },
    defaults: {
      config_key: key,
      config_value: value,
      description,
      updated_by: adminId
    }
  });

  if (!created) {
    await config.update({
      config_value: value,
      updated_by: adminId,
      ...(description && { description })
    });
  }

  return config;
};

export default SystemConfig;