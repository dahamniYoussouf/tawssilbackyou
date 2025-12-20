import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const FoodCategory = sequelize.define("FoodCategory", {
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
    references: {
      model: 'restaurants',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    comment: "Foreign key to restaurant"
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Category name",
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Detailed description of the food category",
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
  tableName: "food_categories",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    { fields: ["restaurant_id"] },
    { fields: ["restaurant_id", "ordre_affichage"] }
  ]
});

export default FoodCategory;
