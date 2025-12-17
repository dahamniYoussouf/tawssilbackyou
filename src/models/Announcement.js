import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Announcement = sequelize.define("Announcement", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Unique announcement identifier (UUID)"
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: "Announcement title"
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: "Announcement content (can include HTML)"
  },
  css_styles: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Custom CSS styles"
  },
  js_scripts: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Custom JavaScript"
  },
  type: {
    type: DataTypes.ENUM("info", "success", "warning", "error"),
    defaultValue: "info",
    allowNull: false,
    comment: "Announcement type"
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: "Whether the announcement is active"
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "When to start showing"
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "When to stop showing"
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
    comment: "Optional restaurant associated with this announcement"
  }
}, {
  tableName: "announcements",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

// Check if announcement is currently active
Announcement.prototype.isCurrentlyActive = function () {
  const now = new Date();
  const startOk = !this.start_date || this.start_date <= now;
  const endOk = !this.end_date || this.end_date >= now;
  return this.is_active && startOk && endOk;
};

export default Announcement;
