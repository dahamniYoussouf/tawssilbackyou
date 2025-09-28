// controllers/orderStatusHistory.controller.js
import Order from "../models/Order.js";
import OrderStatusHistory from "../models/OrderStatusHistory.js";


// Récupérer l'historique d'une commande (utilise la méthode du modèle Order)
export const getOrderHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const history = await order.getStatusHistory();

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'historique"
    });
  }
};

// Récupérer tous les historiques
export const getAll = async (req, res) => {
  try {
    const history = await OrderStatusHistory.findAll({
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['order_number', 'status']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Error fetching all history:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'historique"
    });
  }
};