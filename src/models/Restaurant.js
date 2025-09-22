const { DataTypes } = require('sequelize');

// Lazy loading function to avoid immediate sequelize initialization
function getRestaurantModel() {
  try {
    const sequelize = require('../config/database');
    
    // Check if model is already defined to avoid re-definition
    if (sequelize.models.Restaurant) {
      return sequelize.models.Restaurant;
    }
    
    const Restaurant = sequelize.define('Restaurant', {
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

    // Add prototype methods
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
    
    return Restaurant;
    
  } catch (error) {
    console.error('Error initializing Restaurant model:', error);
    throw new Error(`Failed to initialize Restaurant model: ${error.message}`);
  }
}

// Export a proxy that lazily loads the model
module.exports = new Proxy({}, {
  get(target, prop) {
    const Restaurant = getRestaurantModel();
    if (typeof Restaurant[prop] === 'function') {
      return Restaurant[prop].bind(Restaurant);
    }
    return Restaurant[prop];
  }
});