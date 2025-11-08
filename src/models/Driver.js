import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)"
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
  driver_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: "Unique driver code (e.g., DRV-0001)"
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Driver's first name"
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Driver's last name"
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: "Driver's phone number"
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: "Driver's email"
  },
  vehicle_type: {
    type: DataTypes.ENUM('motorcycle', 'car', 'bicycle', 'scooter'),
    allowNull: false,
    comment: "Type of vehicle"
  },
  vehicle_plate: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Vehicle plate number"
  },
  license_number: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Driver's license number"
  },
  status: {
    type: DataTypes.ENUM('available', 'busy', 'offline', 'suspended'),
    defaultValue: 'offline',
    allowNull: false,
    comment: "Current driver status"
  },
  current_location: 
    process.env.NODE_ENV === "test"
      ? {
          type: DataTypes.JSON,
          allowNull: true,
        }
      : {
    type: DataTypes.GEOGRAPHY('POINT', 4326),
    allowNull: true,
    comment: "Current GPS coordinates"
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: true,
    defaultValue: 5.0,
    validate: {
      min: 1.0,
      max: 5.0
    },
    comment: "Average rating (1-5 stars)"
  },
  total_deliveries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: "Total number of completed deliveries"
  },
    active_orders: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    allowNull: false,
    comment: "Array of active order IDs (multiple deliveries)"
  },
    max_orders_capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    allowNull: false,
    comment: "Maximum number of orders this driver can handle simultaneously"
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: "Driver verification status"
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: "Driver account active status"
  },
  last_active_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Last time driver was active"
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Admin notes about driver"
  },
  cancellation_count: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
  allowNull: false,
  comment: "Number of order cancellations by driver"
}
}, {
  tableName: 'drivers',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['phone']
    },
    {
      fields: ['driver_code']
    },
      {
    fields: ['current_location'],
    using: 'gist', 
    name: 'drivers_location_gix'
  }
  ]
});

// Instance methods
Driver.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

Driver.prototype.setCurrentLocation = function(longitude, latitude) {
  this.current_location = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
};

Driver.prototype.getCurrentCoordinates = function() {
  if (this.current_location && this.current_location.coordinates) {
    return {
      longitude: this.current_location.coordinates[0],
      latitude: this.current_location.coordinates[1]
    };
  }
  return null;
};

Driver.prototype.isAvailable = function() {
  return this.status === 'available' && 
         this.is_active && 
         this.active_orders.length < this.max_orders_capacity;
};



Driver.prototype.updateRating = function(newRating) {
  if (this.total_deliveries === 0) {
    this.rating = newRating;
  } else {
    const totalRating = this.rating * this.total_deliveries;
    this.rating = (totalRating + newRating) / (this.total_deliveries + 1);
  }
  this.total_deliveries += 1;
};

Driver.prototype.incrementCancellations = async function() {
  this.cancellation_count += 1;
  return this.cancellation_count;
};

Driver.prototype.shouldNotifyAdmin = function() {
  return this.cancellation_count >= 3;
};


Driver.prototype.canAcceptMoreOrders = function() {
  return this.status === 'available' && 
         this.is_active && 
         this.active_orders.length < this.max_orders_capacity;
};

Driver.prototype.hasActiveOrders = function() {
  return this.active_orders && this.active_orders.length > 0;
};

Driver.prototype.addActiveOrder = async function(orderId) {
  if (!this.active_orders.includes(orderId)) {
    this.active_orders = [...this.active_orders, orderId];
    this.status = 'busy';
    
    this.changed('active_orders', true);
    
    await this.save();
    console.log(`✅ Added order ${orderId} to driver ${this.id}. Active orders:`, this.active_orders);
  }
  return this.active_orders;
};

Driver.prototype.removeActiveOrder = async function(orderId) {
  this.active_orders = this.active_orders.filter(id => id !== orderId);
  
  if (this.active_orders.length === 0) {
    this.status = 'available';
  }
  
  this.changed('active_orders', true);
  
  await this.save();
  console.log(`✅ Removed order ${orderId} from driver ${this.id}. Remaining:`, this.active_orders);
  
  return this.active_orders;
};

Driver.prototype.getActiveOrdersCount = function() {
  return this.active_orders.length;
};
export default Driver;