import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const OrderItemAddition = sequelize.define("OrderItemAddition", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  order_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  addition_id: {
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
    allowNull: false,
  },
}, {
  tableName: "order_item_additions",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [
    { fields: ["order_item_id"] },
    { fields: ["addition_id"] },
  ],
  hooks: {
    beforeValidate: (itemAddition) => {
      const qty = parseInt(itemAddition.quantite);
      const unit = parseFloat(itemAddition.prix_unitaire);
      itemAddition.prix_total = unit * qty;
    },
    beforeUpdate: (itemAddition) => {
      if (itemAddition.changed("quantite") || itemAddition.changed("prix_unitaire")) {
        const qty = parseInt(itemAddition.quantite);
        const unit = parseFloat(itemAddition.prix_unitaire);
        itemAddition.prix_total = unit * qty;
      }
    }
  }
});

export default OrderItemAddition;
