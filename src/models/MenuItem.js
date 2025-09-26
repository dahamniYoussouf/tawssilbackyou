import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const MenuItem = sequelize.define("MenuItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)",
  },
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "FK to restaurants.id",
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "FK to food_categories.id",
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Dish name",
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Dish description",
  },
  prix: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Dish price",
  },
  temps_preparation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Preparation time in minutes",
  },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Ingredients list",
  },
  allergenes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Allergens list",
  },
  photo_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
    },
    comment: "Photo URL of the dish",
  },
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: "Whether the dish is available",
  },
}, {
  tableName: "menu_items",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

export default MenuItem;
