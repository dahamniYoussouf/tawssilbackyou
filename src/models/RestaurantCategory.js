import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const RestaurantCategory = sequelize.define("RestaurantCategory", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4, 
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)",
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Category name",
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Detailed description of the Restaurant category",
  },
  icone_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
    },
    comment: "Icon image URL representing the category",
  },
  ordre_affichage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Display order for sorting categories",
  },
}, {
  tableName: "restaurant_categories",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

export default RestaurantCategory;
