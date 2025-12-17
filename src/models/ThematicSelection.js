import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const ThematicSelection = sequelize.define("ThematicSelection", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  home_category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "home_categories",
      key: "id"
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
}, {
  tableName: "thematic_selections",
  underscored: true,
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

export default ThematicSelection;
