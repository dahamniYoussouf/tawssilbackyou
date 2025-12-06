// src/models/Cashier.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import { normalizePhoneNumber } from "../utils/phoneNormalizer.js";

const Cashier = sequelize.define('Cashier', {
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
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'restaurants',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: "Restaurant où travaille le caissier"
  },
  cashier_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: "Unique cashier code (e.g., CSH-0001)"
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Cashier's first name"
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Cashier's last name"
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Cashier's phone number"
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: "Cashier's email"
  },
  profile_image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: {
        msg: "Profile image URL is not valid"
      }
    },
    comment: "Cashier's profile picture URL"
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: "Cashier account active status"
  },
  status: {
    type: DataTypes.ENUM('active', 'on_break', 'offline', 'suspended'),
    defaultValue: 'offline',
    allowNull: false,
    comment: "Current cashier status"
  },
  shift_start: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Current shift start time"
  },
  shift_end: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Current shift end time"
  },
  total_orders_processed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: "Total number of orders processed"
  },
  total_sales_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false,
    comment: "Total sales amount processed"
  },
  last_active_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Last time cashier was active"
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Admin notes about cashier"
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: {
      can_create_orders: true,
      can_cancel_orders: false,
      can_apply_discounts: false,
      can_process_refunds: false,
      can_view_reports: false
    },
    comment: "Cashier permissions"
  }
}, {
  tableName: 'cashiers',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (cashier) => {
      if (cashier.phone) {
        cashier.phone = normalizePhoneNumber(cashier.phone);
      }
    },
    beforeUpdate: async (cashier) => {
      if (cashier.changed('phone') && cashier.phone) {
        cashier.phone = normalizePhoneNumber(cashier.phone);
      }
    }
  },
  indexes: [
    { fields: ['restaurant_id'] },
    { fields: ['status'] },
    { fields: ['cashier_code'], unique: true }
  ]
});

// Instance methods
Cashier.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

Cashier.prototype.startShift = async function() {
  this.status = 'active';
  this.shift_start = new Date();
  this.shift_end = null;
  this.last_active_at = new Date();
  await this.save();
};

Cashier.prototype.endShift = async function() {
  this.status = 'offline';
  this.shift_end = new Date();
  await this.save();
};

Cashier.prototype.incrementOrderCount = async function(amount) {
  this.total_orders_processed += 1;
  this.total_sales_amount = parseFloat(this.total_sales_amount) + parseFloat(amount);
  this.last_active_at = new Date();
  await this.save();
};

Cashier.prototype.hasPermission = function(permission) {
  return this.permissions?.[permission] === true;
};

// Static method to generate cashier code
Cashier.generateCashierCode = async function() {
  const lastCashier = await Cashier.findOne({
    order: [['created_at', 'DESC']],
    attributes: ['cashier_code']
  });
  
  if (!lastCashier) {
    return 'CSH-0001';
  }
  
  const lastNumber = parseInt(lastCashier.cashier_code.split('-')[1]);
  const newNumber = lastNumber + 1;
  return `CSH-${String(newNumber).padStart(4, '0')}`;
};

export default Cashier;