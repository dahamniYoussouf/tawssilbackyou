import { DataTypes, Op } from "sequelize";
import { sequelize } from "../config/database.js";
import OrderStatusHistory from './OrderStatusHistory.js';


const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
    comment: "Primary key (UUID)",
  },
  order_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: "Numéro de commande unique (ex: DEL-20241201-0001)"
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "ID de l'utilisateur qui a passé la commande"
  },
  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "ID du restaurant"
  },
  order_type: {
    type: DataTypes.ENUM("delivery", "pickup"),
    defaultValue: "delivery",
    allowNull: false,
    comment: "Type de commande: livraison ou à emporter"
  },
  delivery_address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Adresse de livraison complète (requis pour delivery)"
  },
  delivery_location: 
    process.env.NODE_ENV === "test"
      ? {
          type: DataTypes.JSON,
          allowNull: true,
        }
      : {
    type: DataTypes.GEOGRAPHY('POINT', 4326),
    allowNull: true,
    comment: "Coordonnées GPS de l'adresse de livraison (requis pour delivery)"
  },
  status: {
    type: DataTypes.ENUM(
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "picked_up",
    "on_the_way",
    "delivered",
    "cancelled",
    "refunded"
    ),
    defaultValue: "pending",
    allowNull: false,
    comment: "Statut actuel de la commande"
  },
  payment_status: {
    type: DataTypes.ENUM(
    "pending",
    "processing",
    "paid",
    "failed",
    "refunded",
    "partially_refunded"
    ),
    defaultValue: "pending",
    allowNull: false,
    comment: "Statut du paiement"
  },
  payment_method: {
    type: DataTypes.ENUM(
      "baridi_mob",
      "cash_on_delivery",
      "bank_transfer"
    ),
    allowNull: true,
    comment: "Méthode de paiement utilisée"
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: "Sous-total (prix des articles)"
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    },
    comment: "Frais de livraison (0 pour pickup)"
  },
  service_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    },
    comment: "Frais de service"
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    },
    comment: "Montant des taxes"
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    },
    comment: "Montant de la réduction appliquée"
  },
  tip_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    },
    comment: "Montant du pourboire"
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: "Montant total de la commande"
  },
  delivery_instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Instructions spéciales (livraison ou pickup)"
  },
  estimated_delivery_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Heure estimée de livraison/pickup"
  },
  actual_delivery_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Heure réelle de livraison/pickup"
  },
  livreur_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: "ID du livreur assigné (delivery seulement)"
  },
  coupon_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Code promo utilisé"
  },
  pickup_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Heure souhaitée de récupération (pickup seulement)"
  },
  pickup_instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Instructions spéciales pour le pickup"
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: true,
    validate: {
      min: 1.0,
      max: 5.0
    },
    comment: "Note donnée par le client (1-5 étoiles)"
  },
  review_comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Commentaire de review du client"
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Raison de l'annulation"
  },
  cancelled_by: {
    type: DataTypes.ENUM("customer", "restaurant", "system", "admin"),
    allowNull: true,
    comment: "Qui a annulé la commande"
  },
  is_scheduled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: "Commande programmée ou immédiate"
  },
  scheduled_for: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Date/heure programmée pour la commande"
  },
  preparation_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    },
    comment: "Temps de préparation estimé en minutes"
  },
  special_requests: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Demandes spéciales du client"
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
    }
  }
});

// 🏷️ Méthodes d'instance
Order.prototype.setDeliveryCoordinates = function(longitude, latitude) {
  if (this.order_type === 'delivery') {
    this.delivery_location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
  }
};

Order.prototype.getDeliveryCoordinates = function() {
  if (this.order_type === 'delivery' && this.delivery_location && this.delivery_location.coordinates) {
    return {
      longitude: this.delivery_location.coordinates[0],
      latitude: this.delivery_location.coordinates[1]
    };
  }
  return null;
};

Order.prototype.calculateTotal = function() {
  let deliveryFee = parseFloat(this.delivery_fee || 0);
  
  // Pas de frais de livraison pour pickup
  if (this.order_type === 'pickup') {
    deliveryFee = 0;
    this.delivery_fee = 0;
  }
  
  const total = parseFloat(this.subtotal || 0) 
    + deliveryFee
    + parseFloat(this.service_fee || 0)
    + parseFloat(this.tax_amount || 0)
    + parseFloat(this.tip_amount || 0)
    - parseFloat(this.discount_amount || 0);
  
  this.total_amount = Math.round(total * 100) / 100;
  return this.total_amount;
};

Order.prototype.canBeCancelled = function() {
  const cancellableStatuses = ['pending', 'confirmed'];
  return cancellableStatuses.includes(this.status);
};

Order.prototype.canBeRated = function() {
  return this.status === 'delivered' && !this.rating;
};

Order.prototype.isCompleted = function() {
  return this.status === 'delivered';
};

Order.prototype.isPaid = function() {
  return this.payment_status === 'paid';
};

Order.prototype.isPickup = function() {
  return this.order_type === 'pickup';
};

Order.prototype.isDelivery = function() {
  return this.order_type === 'delivery';
};

Order.prototype.getStatusLabel = function() {
const statusLabels = {
  'pending': 'Pending',
  'confirmed': 'Confirmed',
  'preparing': 'Preparing',
  'ready': this.order_type === 'pickup' ? 'Ready for pickup' : 'Ready for delivery',
  'picked_up': this.order_type === 'pickup' ? 'Picked up' : 'Picked up by driver',
  'on_the_way': 'On the way',
  'delivered': this.order_type === 'pickup' ? 'Picked up' : 'Delivered',
  'cancelled': 'Cancelled',
  'refunded': 'Refunded'
};
  return statusLabels[this.status] || this.status;
};

Order.prototype.getEstimatedTimeString = function() {
  const timeField = this.order_type === 'pickup' ? 'pickup_time' : 'estimated_delivery_time';
  const targetTime = this[timeField];
  
  if (!targetTime) return null;
  
  const now = new Date();
  const eta = new Date(targetTime);
  const diffMinutes = Math.round((eta - now) / (1000 * 60));
  
  if (diffMinutes <= 0) return "Maintenant";
  if (diffMinutes <= 60) return `${diffMinutes} min`;
  
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return `${hours}h ${mins}min`;
};

Order.prototype.getOrderAge = function() {
  const now = new Date();
  const created = new Date(this.created_at);
  const diffMinutes = Math.round((now - created) / (1000 * 60));
  
  if (diffMinutes < 60) return `${diffMinutes} min`;
  
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return `${hours}h ${mins}min`;
};

Order.generateOrderNumber = async function(orderType = 'delivery') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = orderType === 'pickup' ? 'PKP' : 'DEL';
  
  // Trouver le dernier numéro du jour pour ce type
  const lastOrder = await Order.findOne({
    where: {
      order_number: {
        [Op.like]: `${prefix}-${date}-%`
      }
    },
    order: [['created_at', 'DESC']]
  });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.order_number.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${date}-${sequence.toString().padStart(4, '0')}`;
};

Order.prototype.generateOrderNumber = async function() {
  this.order_number = await Order.generateOrderNumber(this.order_type);
  return this.order_number;
};

Order.addHook('afterUpdate', async (order, options) => {
  if (order.changed('status')) {
    const previousStatus = order._previousDataValues.status;
    
    await OrderStatusHistory.create({
      order_id: order.id,
      old_status: previousStatus,
      new_status: order.status,
      changed_by: options.changedBy || 'system',
      notes: options.changeNotes || null
    });
  }
});

// 🏷️ Nouvelle méthode pour récupérer l'historique
Order.prototype.getStatusHistory = async function() {
  return await OrderStatusHistory.findAll({
    where: { order_id: this.id },
    order: [['created_at', 'ASC']]
  });
};



export default Order;