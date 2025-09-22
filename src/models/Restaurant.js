const { DataTypes } = require('sequelize');

let Restaurant;

try {
  const sequelize = require('../config/database');
  
  Restaurant = sequelize.define('Restaurant', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
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

} catch (error) {
  console.error('Failed to initialize Restaurant model:', error);
  // Create a mock model to prevent crashes
  Restaurant = {
    findAll: () => Promise.reject(new Error('Database not initialized')),
    create: () => Promise.reject(new Error('Database not initialized')),
    findByPk: () => Promise.reject(new Error('Database not initialized'))
  };
}

module.exports = Restaurant;