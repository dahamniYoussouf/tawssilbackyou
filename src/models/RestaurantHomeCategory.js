import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const RestaurantHomeCategory = sequelize.define("RestaurantHomeCategory", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key for the restaurant-home category link"
  },
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "restaurants",
      key: "id"
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    comment: "Reference to the restaurant"
  },
  home_category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "home_categories",
      key: "id"
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    comment: "Reference to the parent category"
  }
}, {
  tableName: "restaurant_home_categories",
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ["restaurant_id", "home_category_id"]
    },
    {
      fields: ["restaurant_id"]
    },
    {
      fields: ["home_category_id"]
    }
  ]
});

export default RestaurantHomeCategory;
