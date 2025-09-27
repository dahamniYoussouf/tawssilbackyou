import { Op } from "sequelize";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import Client from "../models/Client.js";

// 🆕 CREATE - Créer une nouvelle commande
export const createOrder = async (req, res, next) => {
  try {
    const {
      client_id,
      restaurant_id,
      order_type = 'delivery',
      delivery_address,
      lat,
      lng,
      subtotal,
      delivery_fee,
      service_fee,
      tax_amount,
      discount_amount,
      tip_amount,
      payment_method,
      delivery_instructions,
      pickup_time,
      pickup_instructions,
      coupon_code,
      special_requests,
      is_scheduled = false,
      scheduled_for
    } = req.body;

    // Vérifier que le restaurant existe
    const restaurant = await Restaurant.findByPk(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: "Restaurant not found"
      });
    }

    // Créer la commande
    const orderData = {
      client_id,
      restaurant_id,
      order_type,
      delivery_address: order_type === 'delivery' ? delivery_address : null,
      subtotal,
      delivery_fee: delivery_fee || 0,
      service_fee: service_fee || 0,
      tax_amount: tax_amount || 0,
      discount_amount: discount_amount || 0,
      tip_amount: tip_amount || 0,
      payment_method,
      delivery_instructions,
      pickup_time,
      pickup_instructions,
      coupon_code,
      special_requests,
      is_scheduled,
      scheduled_for
    };
    const tempOrder = Order.build(orderData);
    tempOrder.calculateTotal();
    await tempOrder.generateOrderNumber();
    await tempOrder.save()
    const order = tempOrder;
    // Définir les coordonnées si delivery
    if (order_type === 'delivery' && lat && lng) {
      order.setDeliveryCoordinates(parseFloat(lng), parseFloat(lat));
      await order.save();
    }

    // Calculer le total
    order.calculateTotal();
    await order.save();

    // Récupérer la commande avec les relations
    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Client, as: 'client' }
      ]
    });

    res.status(201).json({
      success: true,
      data: fullOrder
    });

  } catch (error) {
    next(error);
  }
};

// 📋 GET ALL - Récupérer toutes les commandes avec filtres
export const getAllOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      payment_status,
      order_type,
      client_id,
      restaurant_id,
      date_from,
      date_to,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereConditions = {};

    // Filtres
    if (status) whereConditions.status = status;
    if (payment_status) whereConditions.payment_status = payment_status;
    if (order_type) whereConditions.order_type = order_type;
    if (client_id) whereConditions.client_id = client_id;
    if (restaurant_id) whereConditions.restaurant_id = restaurant_id;

    // Filtre par date
    if (date_from || date_to) {
      whereConditions.created_at = {};
      if (date_from) whereConditions.created_at[Op.gte] = new Date(date_from);
      if (date_to) whereConditions.created_at[Op.lte] = new Date(date_to);
    }

    // Recherche par numéro de commande
    if (search) {
      whereConditions.order_number = {
        [Op.iLike]: `%${search}%`
      };
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereConditions,
      include: [
        { 
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['id', 'name', 'image_url', 'address']
        },
        { 
          model: Client, 
          as: 'client',
          attributes: ['id', 'first_name','last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: count,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    next(error);
  }
};

// 🔍 GET BY ID - Récupérer une commande par ID
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Client, as: 'client' },
        // Ajouter OrderItems si vous avez cette relation
        // { model: OrderItem, as: 'items', include: [MenuItem] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Commande introuvable"
      });
    }

    // Ajouter des infos calculées
    const orderData = order.toJSON();
    orderData.status_label = order.getStatusLabel();
    orderData.estimated_time_string = order.getEstimatedTimeString();
    orderData.order_age = order.getOrderAge();
    orderData.can_be_cancelled = order.canBeCancelled();
    orderData.can_be_rated = order.canBeRated();

    res.json({
      success: true,
      data: orderData
    });

  } catch (error) {
    next(error);
  }
};

// ✏️ UPDATE - Mettre à jour une commande
export const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Commande introuvable"
      });
    }

    // Empêcher la modification de certains champs selon le statut
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: "Impossible de modifier une commande livrée ou annulée"
      });
    }

    // Mettre à jour
    await order.update(updateData);

    // Recalculer le total si nécessaire
    if (updateData.subtotal || updateData.delivery_fee || updateData.service_fee || 
        updateData.tax_amount || updateData.discount_amount || updateData.tip_amount) {
      order.calculateTotal();
      await order.save();
    }

    // Récupérer la commande mise à jour
    const updatedOrder = await Order.findByPk(id, {
      include: [
        { model: Restaurant, as: 'restaurant' },
        { model: Client, as: 'client' }
      ]
    });

    res.json({
      success: true,
      message: "Commande mise à jour avec succès",
      data: updatedOrder
    });

  } catch (error) {
    next(error);
  }
};

// ❌ DELETE - Supprimer une commande
export const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Commande introuvable"
      });
    }

    // Vérifier si la commande peut être supprimée
    if (order.status === 'delivered' || order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: "Impossible de supprimer une commande livrée ou payée"
      });
    }

    await order.destroy();

    res.json({
      success: true,
      message: "Commande supprimée avec succès"
    });

  } catch (error) {
    next(error);
  }
};

// 🔄 UPDATE STATUS - Mettre à jour le statut d'une commande
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, cancellation_reason, cancelled_by } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Commande introuvable"
      });
    }

    // Logique de validation des transitions de statut
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['picked_up', 'on_the_way', 'cancelled'],
      'picked_up': ['on_the_way', 'delivered'],
      'on_the_way': ['delivered'],
      'delivered': ['refunded'],
      'cancelled': [],
      'refunded': []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Impossible de passer de ${order.status} à ${status}`
      });
    }

    // Mettre à jour le statut
    const updateData = { status };

    // Si annulation, enregistrer la raison
    if (status === 'cancelled') {
      if (!cancellation_reason || !cancelled_by) {
        return res.status(400).json({
          success: false,
          error: "cancellation_reason et cancelled_by sont requis pour une annulation"
        });
      }
      updateData.cancellation_reason = cancellation_reason;
      updateData.cancelled_by = cancelled_by;
    }

    // Si livré, enregistrer l'heure
    if (status === 'delivered') {
      updateData.actual_delivery_time = new Date();
    }

    await order.update(updateData);

    res.json({
      success: true,
      message: "Statut mis à jour avec succès",
      data: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        status_label: order.getStatusLabel()
      }
    });

  } catch (error) {
    next(error);
  }
};

// 💳 UPDATE PAYMENT STATUS - Mettre à jour le statut de paiement
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Commande introuvable"
      });
    }

    const updateData = { payment_status };
    if (payment_method) {
      updateData.payment_method = payment_method;
    }

    await order.update(updateData);

    res.json({
      success: true,
      message: "Statut de paiement mis à jour avec succès",
      data: {
        id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        payment_method: order.payment_method
      }
    });

  } catch (error) {
    next(error);
  }
};

// 🚚 ASSIGN DELIVERY PERSON - Assigner un livreur
export const assignDeliveryPerson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { livreur_id } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Commande introuvable"
      });
    }

    if (order.order_type !== 'delivery') {
      return res.status(400).json({
        success: false,
        error: "Impossible d'assigner un livreur à une commande pickup"
      });
    }

    await order.update({ livreur_id });

    res.json({
      success: true,
      message: "Livreur assigné avec succès",
      data: {
        id: order.id,
        order_number: order.order_number,
        livreur_id: order.livreur_id
      }
    });

  } catch (error) {
    next(error);
  }
};

// ⭐ ADD RATING - Ajouter une évaluation
export const addRating = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, review_comment } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Commande introuvable"
      });
    }

    if (!order.canBeRated()) {
      return res.status(400).json({
        success: false,
        error: "Cette commande ne peut pas être évaluée"
      });
    }

    await order.update({ rating, review_comment });

    res.json({
      success: true,
      message: "Évaluation ajoutée avec succès",
      data: {
        id: order.id,
        order_number: order.order_number,
        rating: order.rating,
        review_comment: order.review_comment
      }
    });

  } catch (error) {
    next(error);
  }
};

// 📊 GET ORDER STATISTICS - Statistiques des commandes
export const getOrderStatistics = async (req, res, next) => {
  try {
    const { period = '30d', restaurant_id } = req.query;

    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { [Op.gte]: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { [Op.gte]: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { [Op.gte]: new Date(now - 90 * 24 * 60 * 60 * 1000) };
        break;
    }

    const whereConditions = { created_at: dateFilter };
    if (restaurant_id) {
      whereConditions.restaurant_id = restaurant_id;
    }

    const [
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      averageRating
    ] = await Promise.all([
      Order.count({ where: whereConditions }),
      Order.count({ where: { ...whereConditions, status: 'delivered' } }),
      Order.count({ where: { ...whereConditions, status: 'cancelled' } }),
      Order.sum('total_amount', { where: { ...whereConditions, payment_status: 'paid' } }),
      Order.findOne({
        where: { ...whereConditions, rating: { [Op.not]: null } },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']]
      })
    ]);

    res.json({
      success: true,
      data: {
        period,
        total_orders: totalOrders || 0,
        delivered_orders: deliveredOrders || 0,
        cancelled_orders: cancelledOrders || 0,
        completion_rate: totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(2) : 0,
        total_revenue: totalRevenue || 0,
        average_rating: averageRating?.dataValues?.avg_rating ? 
          parseFloat(averageRating.dataValues.avg_rating).toFixed(1) : null
      }
    });

  } catch (error) {
    next(error);
  }
};

// 🔍 GET client ORDERS - Commandes d'un utilisateur
export const getClientOrders = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;
    const whereConditions = { client_id: clientId };

    if (status) {
      whereConditions.status = status;
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereConditions,
      include: [
        { 
          model: Restaurant, 
          as: 'restaurant',
          attributes: ['id', 'name', 'image_url', 'address']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Ajouter les infos calculées
    const ordersWithExtras = rows.map(order => {
      const orderData = order.toJSON();
      orderData.status_label = order.getStatusLabel();
      orderData.estimated_time_string = order.getEstimatedTimeString();
      orderData.can_be_cancelled = order.canBeCancelled();
      orderData.can_be_rated = order.canBeRated();
      return orderData;
    });

    res.json({
      success: true,
      data: ordersWithExtras,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count
      }
    });

  } catch (error) {
    next(error);
  }
};