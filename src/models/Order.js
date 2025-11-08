import { DataTypes, Op } from "sequelize";
import { sequelize } from "../config/database.js";

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  preparation_time: {
  type: DataTypes.INTEGER, // in minutes
  allowNull: true,
  comment: 'Estimated time in minutes for restaurant to prepare the order'
},
  order_number: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  order_type: {
    type: DataTypes.ENUM("delivery", "pickup"),
    defaultValue: "delivery",
  },
  delivery_address: {
    type: DataTypes.TEXT,
  },
  delivery_location: 
    process.env.NODE_ENV === "test"
      ? { type: DataTypes.JSON, allowNull: true }
      : { type: DataTypes.GEOGRAPHY('POINT', 4326), allowNull: true },
  
  // SIMPLIFIED STATUS - matches your workflow exactly
  status: {
    type: DataTypes.ENUM(
      "pending",    // Client validates order
      "accepted",   // Restaurant accepts
      "preparing",  // Restaurant preparing (auto after 1 min)
      "assigned",   // Driver assigned (for delivery only)
      "arrived",    // Driver arrived at restaurant
      "delivering", // Driver en route (GPS tracked via driver.current_location)
      "delivered",  // Order completed
      "declined"    // Restaurant declined
    ),
    defaultValue: "pending",
  },
  
  // Payment - simplified to just the method
  payment_method: {
    type: DataTypes.ENUM("baridi_mob", "cash_on_delivery", "bank_transfer"),
  },
  
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  delivery_instructions: {
    type: DataTypes.TEXT,
  },
  estimated_delivery_time: {
    type: DataTypes.DATE,
  },
  
  // Driver reference (driver.current_location is the GPS tracker)
  livreur_id: {
    type: DataTypes.UUID,
  },
  
  // Timer fields for auto-transitions
  accepted_at: {
    type: DataTypes.DATE,
  },
  preparing_started_at: {
    type: DataTypes.DATE,
  },
  assigned_at: {
    type: DataTypes.DATE,
  },
  delivering_started_at: {
    type: DataTypes.DATE,
  },
  delivered_at: {
    type: DataTypes.DATE,
  },
  
  // Simple rating
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    validate: { min: 1.0, max: 5.0 }
  },
  review_comment: {
    type: DataTypes.TEXT,
  },
  
  // Decline reason
  decline_reason: {
    type: DataTypes.TEXT,
  }
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (order) => {
      if (!order.order_number) {
        await order.generateOrderNumber();
      }
    },
    beforeUpdate: async (order) => {
      // Auto-set timestamps based on status
      if (order.changed('status')) {
        const newStatus = order.status;
        
        if (newStatus === 'accepted' && !order.accepted_at) {
          order.accepted_at = new Date();
        } else if (newStatus === 'preparing' && !order.preparing_started_at) {
          order.preparing_started_at = new Date();
        } else if (newStatus === 'assigned' && !order.assigned_at) {
          order.assigned_at = new Date();
        } else if (newStatus === 'delivering' && !order.delivering_started_at) {
          order.delivering_started_at = new Date();
        } else if (newStatus === 'delivered' && !order.delivered_at) {
          order.delivered_at = new Date();
        }
      }
    }
  }
});

// Auto-calculate total
Order.prototype.calculateTotal = function() {
  const deliveryFee = this.order_type === 'pickup' ? 0 : parseFloat(this.delivery_fee || 0);
  this.total_amount = parseFloat(this.subtotal || 0) + deliveryFee;
  return this.total_amount;
};

// Set delivery destination coordinates
Order.prototype.setDeliveryCoordinates = function(lng, lat) {
  if (this.order_type === 'delivery') {
    this.delivery_location = { type: 'Point', coordinates: [lng, lat] };
  }
};

// Generate order number
Order.generateOrderNumber = async function(orderType = 'delivery') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = orderType === 'pickup' ? 'PKP' : 'DEL';
  
  const lastOrder = await Order.findOne({
    where: { order_number: { [Op.like]: `${prefix}-${date}-%` } },
    order: [['created_at', 'DESC']]
  });
  
  let sequence = lastOrder ? parseInt(lastOrder.order_number.split('-')[2]) + 1 : 1;
  return `${prefix}-${date}-${sequence.toString().padStart(4, '0')}`;
};

Order.prototype.generateOrderNumber = async function() {
  this.order_number = await Order.generateOrderNumber(this.order_type);
  return this.order_number;
};

// Status transition validation
Order.prototype.canTransitionTo = function(newStatus) {
  const validTransitions = {
    'pending': ['accepted', 'declined'],
    'accepted': ['preparing'],
    'preparing': ['assigned', 'delivered'], // assigned for delivery, delivered for pickup
    'assigned': ['arrived', 'delivering'],
    'arrived': ['delivering'],
    'delivering': ['delivered'],
    'delivered': [],
    'declined': []
  };
  
  return validTransitions[this.status]?.includes(newStatus) || false;
};

// Status checks
Order.prototype.canBeRated = function() {
  return this.status === 'delivered' && !this.rating;
};

// Get time elapsed since status change
Order.prototype.getTimeInStatus = function() {
  const statusField = {
    'accepted': 'accepted_at',
    'preparing': 'preparing_started_at',
    'assigned': 'assigned_at',
    'arrived': 'arrived_at',
    'delivering': 'delivering_started_at',
    'delivered': 'delivered_at'
  }[this.status];
  
  if (!statusField || !this[statusField]) return null;
  
  const elapsed = Date.now() - new Date(this[statusField]).getTime();
  return Math.floor(elapsed / 60000); // minutes
};

export default Order;