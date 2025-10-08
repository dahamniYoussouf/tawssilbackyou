import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  menu_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  prix_unitaire: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  prix_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // Auto-calculated
  },
  instructions_speciales: {
    type: DataTypes.TEXT,
  }
}, {
  tableName: "order_items",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    { fields: ['order_id'] },
    { fields: ['menu_item_id'] }
  ],
  hooks: {
    beforeValidate: (item) => {
      item.prix_total = parseFloat(item.prix_unitaire) * parseInt(item.quantite);
    },
    beforeUpdate: (item) => {
      if (item.changed('quantite') || item.changed('prix_unitaire')) {
        item.prix_total = parseFloat(item.prix_unitaire) * parseInt(item.quantite);
      }
    }
  }
});

export default OrderItem;