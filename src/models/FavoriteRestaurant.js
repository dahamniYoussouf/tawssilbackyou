import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const isTestEnv = process.env.NODE_ENV === "test";

const favoriteRestaurantIndexes = [
  {
    unique: true,
    fields: ["client_id", "restaurant_id"],
    name: "unique_client_restaurant_favorite"
  },
  {
    fields: ["client_id"],
    name: "idx_favorite_restaurants_client_id"
  },
  {
    fields: ["restaurant_id"],
    name: "idx_favorite_restaurants_restaurant_id"
  },
  {
    fields: ["created_at"],
    name: "idx_favorite_restaurants_created_at"
  }
];

if (!isTestEnv) {
  favoriteRestaurantIndexes.push({
    using: "GIN",
    fields: ["tags"],
    name: "idx_favorite_restaurants_tags"
  });
}

const FavoriteRestaurant = sequelize.define("FavoriteRestaurant", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Unique favorite restaurant identifier (UUID)"
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "clients",
      key: "id"
    },
    onDelete: "CASCADE",
    comment: "Reference to the client who favorited the restaurant"
  },
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "restaurants",
      key: "id"
    },
    onDelete: "CASCADE",
    comment: "Reference to the favorited restaurant"
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Personal notes about the restaurant"
  },
  tags: {
    type: isTestEnv ? DataTypes.JSON : DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: true,
    comment: "Custom tags for organizing favorites"
  }
}, {
  tableName: "favorite_restaurants",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: favoriteRestaurantIndexes
});

export default FavoriteRestaurant;
