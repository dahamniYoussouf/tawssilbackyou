import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const FavoriteAddress = sequelize.define("FavoriteAddress", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Nom court: Domicile, Bureau, etc.",
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  location:
    process.env.NODE_ENV === "test"
      ? { type: DataTypes.JSON, allowNull: true }
      : { type: DataTypes.GEOGRAPHY("POINT", 4326), allowNull: true },
  lat: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
  },
  lng: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

FavoriteAddress.prototype.setCoordinates = function (lng, lat) {
  if (this.location && this.location.type === "Point") return;
  this.location = {
    type: "Point",
    coordinates: [parseFloat(lng), parseFloat(lat)],
  };
};

export default FavoriteAddress;
