import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const AdminNotification = sequelize.define('AdminNotification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)"
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: "Reference to the order"
  },
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'restaurants',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: "Reference to the restaurant"
  },
  type: {
    type: DataTypes.ENUM('pending_order_timeout', 'restaurant_unresponsive', 'driver_unresponsive'),
    defaultValue: 'pending_order_timeout',
    allowNull: false,
    comment: "Type of notification"
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: "Notification message"
  },
  order_details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Complete order information"
  },
  restaurant_info: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Restaurant contact info"
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: "Has admin read this notification"
  },
  is_resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: "Has admin handled this notification"
  },
  resolved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'admins',
      key: 'id'
    },
    comment: "Admin who resolved this"
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "When was this resolved"
  },
  admin_action: {
    type: DataTypes.ENUM('force_accept', 'cancel_order', 'contacted_restaurant', 'none'),
    allowNull: true,
    comment: "Action taken by admin"
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Admin's notes about the resolution"
  }
}, {
  tableName: 'admin_notifications',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['order_id'] },
    { fields: ['restaurant_id'] },
    { fields: ['is_read'] },
    { fields: ['is_resolved'] },
    { fields: ['created_at'] }
  ]
});

export default AdminNotification;