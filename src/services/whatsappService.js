
import axios from 'axios';

/**
 * Envoie un message WhatsApp via l’API Meta
 */
export const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      console.warn('⚠️ WhatsApp non configuré');
      return { success: false, error: 'Configuration manquante' };
    }

    // Format du numéro : 213XXXXXXXXX
    const formattedPhone = phoneNumber.startsWith('+')
      ? phoneNumber.substring(1)
      : `213${phoneNumber.replace(/^0/, '')}`;

    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Message envoyé à', phoneNumber, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Erreur WhatsApp:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};


/**
 * Message templates for orders
 */
export const templates = {
  orderAccepted: (restaurantName, orderNumber) => 
    `🎉 *Commande Acceptée*\n\nVotre commande #${orderNumber} a été acceptée par ${restaurantName}!\n\nMerci de votre confiance 😊`,
  
  orderPreparing: (orderNumber) => 
    `👨‍🍳 *En Préparation*\n\nVotre commande #${orderNumber} est en cours de préparation.\n\nNous préparons vos plats avec soin!`,
  
  driverAssigned: (driverName, driverPhone, orderNumber) => 
    `🛵 *Livreur Assigné*\n\n${driverName} va livrer votre commande #${orderNumber}.\n\n📞 Contact: ${driverPhone}`,
  
  orderDelivering: (orderNumber, eta) => 
    `🚀 *En Route*\n\nVotre commande #${orderNumber} est en route!\n\n⏱️ Arrivée estimée: ${eta} minutes`,
  
  orderDelivered: (orderNumber) => 
    `✅ *Livrée*\n\nVotre commande #${orderNumber} a été livrée!\n\n😋 Bon appétit!`,
  
  orderDeclined: (orderNumber, reason) => 
    `❌ *Commande Annulée*\n\nDésolé, votre commande #${orderNumber} a été annulée.\n\nRaison: ${reason}`,

  orderLocation: (orderNumber, distance, eta) =>
    `📍 *Mise à jour*\n\nVotre commande #${orderNumber} est à ${distance} km.\n\n⏱️ Arrivée dans ${eta} minutes`
};