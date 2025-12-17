import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const PromotionMenuItem = sequelize.define("PromotionMenuItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  promotion_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "promotions",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  menu_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "menu_items",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
}, {
  tableName: "promotion_menu_items",
  underscored: true,
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    {
      unique: true,
      fields: ["promotion_id", "menu_item_id"],
    },
  ],
});

export default PromotionMenuItem;
