import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)",
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "FK to orders.id",
  },
  menu_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "FK to menu_items.id",
  },
  quantite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
    },
    comment: "Quantity of the item ordered",
  },
  prix_unitaire: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Unit price at the time of order (frozen price)",
  },
  prix_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: "Total price for this item (quantite * prix_unitaire + customizations)",
  },
  instructions_speciales: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Special instructions for this item (e.g., 'no onions', 'extra spicy')",
  },
  customizations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "JSON object containing customizations (add-ons, modifications, etc.)",
  },
  statut: {
    type: DataTypes.ENUM('pending', 'preparing', 'ready', 'delivered', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false,
    comment: "Status of this specific item",
  }

}, {
  tableName: "order_items",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    {
      fields: ['order_id']
    },
    {
      fields: ['menu_item_id']
    },
    {
      fields: ['statut']
    }
  ]
});

export default OrderItem;