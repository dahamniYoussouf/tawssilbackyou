import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const FavoriteMeal = sequelize.define("FavoriteMeal", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Unique favorite meal identifier (UUID)"
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "clients",
      key: "id"
    },
    onDelete: "CASCADE",
    comment: "Reference to the client who favorited the meal"
  },
  meal_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "meals",
      key: "id"
    },
    onDelete: "CASCADE",
    comment: "Reference to the favorited meal"
  },
  customizations: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Custom preferences or modifications for the meal"
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Personal notes about the meal"
  }
}, {
  tableName: "favorite_meals",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    {
      unique: true,
      fields: ["client_id", "meal_id"],
      name: "unique_client_meal_favorite"
    },
    {
      fields: ["client_id"],
      name: "idx_favorite_meals_client_id"
    },
    {
      fields: ["meal_id"],
      name: "idx_favorite_meals_meal_id"
    },
    {
      fields: ["created_at"],
      name: "idx_favorite_meals_created_at"
    }
  ]
});

export default FavoriteMeal;