const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Restaurant = sequelize.define('Restaurant', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
   uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4, 
    allowNull: false,
    unique: true
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
  location: {
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
delivery_time_min: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Temps de livraison minimum en minutes'
  },
  delivery_time_max: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Temps de livraison maximum en minutes'
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
  }
}, {
  tableName: 'restaurants',
  timestamps: true,
  underscored: true, 
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

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

Restaurant.prototype.getDeliveryTimeRange = function() {
  if (this.delivery_time_min && this.delivery_time_max) {
    return `${this.delivery_time_min}-${this.delivery_time_max} min`;
  }
  return null;
};

Restaurant.prototype.isOpen = function() {
  if (!this.opening_hours) return true; 
  
  const now = new Date();
  const day = now.toLocaleLowerCase().substring(0, 3); 
  const currentTime = now.getHours() * 100 + now.getMinutes(); 
  
  const todayHours = this.opening_hours[day];
  if (!todayHours) return false;
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

module.exports = Restaurant;
