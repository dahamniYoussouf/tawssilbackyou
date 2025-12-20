import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const MenuItem = sequelize.define("MenuItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  prix: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  photo_url: {
    type: DataTypes.STRING,
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  temps_preparation: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  }
}, {
  tableName: "menu_items",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    { fields: ["category_id"] },
    { fields: ["restaurant_id"] },
    { fields: ["restaurant_id", "is_available", "created_at"] }
  ]
});

export default MenuItem;
