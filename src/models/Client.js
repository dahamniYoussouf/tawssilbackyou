import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Client = sequelize.define("Client", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Unique client identifier (UUID)"
  },
  user_id: {
  type: DataTypes.UUID,
  allowNull: false,
  unique: true,
  references: {
    model: 'users',
    key: 'id'
  },
  onDelete: 'CASCADE',
  comment: "Reference to user account"
},
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: "Client's first name"
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: "Client's last name"
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: "Invalid email address"
      }
    },
    comment: "Client's email (must be unique)"
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[0-9+\- ]*$/i
    },
    comment: "Client's phone number"
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Primary address of the client"
  },
  location:
    process.env.NODE_ENV === "test"
      ? {
          type: DataTypes.JSON,
          allowNull: true
        }
      : {
          type: DataTypes.GEOGRAPHY("POINT", 4326),
          allowNull: true,
          comment: "Geographical coordinates of the client's address"
        },
  profile_image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: {
        msg: "Profile image URL is not valid"
      }
    },
    comment: "Client's profile picture URL"
  },
  loyalty_points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: "Loyalty points earned by the client"
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "Indicates whether the client's email/phone is verified"
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: "Indicates whether the client's account is active"
  },
  status: {
    type: DataTypes.ENUM("active", "suspended", "deleted"),
    defaultValue: "active",
    comment: "Current status of the client's account"
  }
}, {
  tableName: "clients",
  timestamps: true,
  underscored: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

// -------------------------
// Instance Methods
// -------------------------

// Set geographic coordinates
Client.prototype.setCoordinates = function (longitude, latitude) {
  this.location = {
    type: "Point",
    coordinates: [longitude, latitude]
  };
};

// Get geographic coordinates
Client.prototype.getCoordinates = function () {
  if (this.location && this.location.coordinates) {
    return {
      longitude: this.location.coordinates[0],
      latitude: this.location.coordinates[1]
    };
  }
  return null;
};

// Return full name of the client
Client.prototype.getFullName = function () {
  return `${this.first_name} ${this.last_name}`;
};

export default Client;
