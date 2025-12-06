import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";
import bcrypt from "bcryptjs";

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)"
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    comment: "User's email (unique)"
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Hashed password"
  },
  role: {
    type: DataTypes.ENUM('client', 'driver', 'restaurant', 'admin', 'cashier'),
    allowNull: false,
    comment: "User role type"
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: "Account active status"
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Last login timestamp"
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default User;