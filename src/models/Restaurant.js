const { DataTypes } = require('sequelize');

let Restaurant = null;
let initError = null;

function initializeModel() {
  if (Restaurant) return Restaurant;
  
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
    initError = error;
    throw error;
  }
}

// Export object that initializes on first use
module.exports = {
  findAll: (...args) => {
    const model = initializeModel();
    return model.findAll(...args);
  },
  findByPk: (...args) => {
    const model = initializeModel();
    return model.findByPk(...args);
  },
  create: (...args) => {
    const model = initializeModel();
    return model.create(...args);
  },
  update: (...args) => {
    const model = initializeModel();
    return model.update(...args);
  },
  destroy: (...args) => {
    const model = initializeModel();
    return model.destroy(...args);
  },
  // Add other Sequelize methods as needed
  findOne: (...args) => {
    const model = initializeModel();
    return model.findOne(...args);
  },
  count: (...args) => {
    const model = initializeModel();
    return model.count(...args);
  }
};