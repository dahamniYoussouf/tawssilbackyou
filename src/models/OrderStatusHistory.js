import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  old_status: {
    type: DataTypes.ENUM(
      "pending",
      "confirmed", 
      "preparing",
      "ready",
      "picked_up",
      "on_the_way",
      "delivered",
      "cancelled",
      "refunded"
    ),
    allowNull: true
  },
  new_status: {
    type: DataTypes.ENUM(
      "pending",
      "confirmed",
      "preparing",
      "ready", 
      "picked_up",
      "on_the_way",
      "delivered",
      "cancelled",
      "refunded"
    ),
    allowNull: false
  },
  changed_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Qui a fait le changement"
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'order_status_history',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default OrderStatusHistory;