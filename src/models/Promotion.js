import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Promotion = sequelize.define("Promotion", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM("percentage", "amount", "free_delivery", "buy_x_get_y", "other"),
    allowNull: false,
  },
  scope: {
    type: DataTypes.ENUM("menu_item", "restaurant", "cart", "delivery", "global"),
    allowNull: false,
    defaultValue: "menu_item",
  },
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: "restaurants",
      key: "id"
    },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  },
  menu_item_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: "menu_items",
      key: "id"
    },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: "DZD",
  },
  badge_text: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  custom_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  buy_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  free_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: "promotions",
  underscored: true,
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

export default Promotion;
