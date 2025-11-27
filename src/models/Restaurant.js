import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";

const Restaurant = sequelize.define('Restaurant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)",
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
    phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Restaurant contact phone number'
  },
  location:
  process.env.NODE_ENV === "test"
        ? {
            type: DataTypes.JSON,
            allowNull: true,
          }
        : {
    type: DataTypes.GEOGRAPHY('POINT', 4326),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'La localisation est requise'
      }
    }
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: true,
    defaultValue: 0.0,
    validate: {
      min: 0.0,
      max: 5.0
    },
    comment: 'Note sur 5 étoiles'
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    },
    comment: 'URL de l\'image principale du restaurant'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Restaurant actif ou non'
  },
  is_premium: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Restaurant premium ou non'
  },
  status: {
    type: DataTypes.ENUM("pending", "approved", "suspended", "archived"),
    defaultValue: "pending"
  },
  opening_hours: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Opening hours per day, e.g.: { Mon: {open: 9:00 a.m., close: 6:00 p.m.}, Tue: {...} }"
  }, 
  categories: {
    type: DataTypes.ARRAY(DataTypes.ENUM(
      'pizza',
      'burger',
      'tacos',
      'sandwish'
    )),
    allowNull: false,
    defaultValue: [],
    validate: {
      notEmpty: {
        msg: 'Restaurant must have at least one category'
      },
      isValidArray(value) {
        if (!Array.isArray(value)) {
          throw new Error('Categories must be an array');
        }
        if (value.length === 0) {
          throw new Error('Restaurant must have at least one category');
        }
      }
    },
    comment: "Restaurant categories (can have multiple)"
  },
}, {
  tableName: 'restaurants',
  timestamps: true,
  underscored: true, 
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (restaurant) => {
      if (restaurant.phone_number) {
        restaurant.phone_number = normalizePhoneNumber(restaurant.phone_number);
      }
    },
    beforeUpdate: async (restaurant) => {
      if (restaurant.changed('phone_number') && restaurant.phone_number) {
        restaurant.phone_number = normalizePhoneNumber(restaurant.phone_number);
      }
    }
  },
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_premium']
    },
    {
      fields: ['location'],
      using: 'gist',
      name: 'restaurants_location_gix'
    }, 
    {
    fields: ['categories'],
    using: 'gin',
    name: 'restaurants_categories_gin'
  }
  ]
});

// Helper methods
Restaurant.prototype.setCoordinates = function(longitude, latitude) {
  this.location = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
};

Restaurant.prototype.getCoordinates = function() {
  if (this.location && this.location.coordinates) {
    return {
      longitude: this.location.coordinates[0],
      latitude: this.location.coordinates[1]
    };
  }
  return null;
};


Restaurant.prototype.isOpen = function () {
  if (!this.opening_hours) return false;

  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  const todayHours = this.opening_hours[day];
  if (!todayHours) return false;

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

Restaurant.prototype.hasCategory = function(category) {
  return this.categories && this.categories.includes(category);
};

Restaurant.prototype.addCategory = function(category) {
  if (!this.categories) {
    this.categories = [];
  }
  if (!this.categories.includes(category)) {
    this.categories.push(category);
  }
};

Restaurant.prototype.removeCategory = function(category) {
  if (this.categories) {
    this.categories = this.categories.filter(cat => cat !== category);
  }
};

export default Restaurant;