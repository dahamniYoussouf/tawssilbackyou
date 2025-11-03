// src/services/multiDeliveryService.js
import axios from 'axios';
import { sequelize } from '../config/database.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Driver from '../models/Driver.js';
import SystemConfig from '../models/SystemConfig.js';

/**
 * Vérifie si deux restaurants sont à moins de MAX_DISTANCE_BETWEEN_RESTAURANTS mètres
 */
export const areRestaurantsNearby = async (restaurant1Id, restaurant2Id) => {
  const maxDistance = await SystemConfig.get('max_distance_between_restaurants', 500); // 500m par défaut

  const [restaurant1, restaurant2] = await Promise.all([
    Restaurant.findByPk(restaurant1Id),
    Restaurant.findByPk(restaurant2Id)
  ]);

  if (!restaurant1 || !restaurant2) {
    return false;
  }

  const coords1 = restaurant1.location?.coordinates;
  const coords2 = restaurant2.location?.coordinates;

  if (!coords1 || !coords2) {
    return false;
  }

  // Calcul de distance PostGIS
  const result = await sequelize.query(`
    SELECT ST_Distance(
      ST_GeogFromText('POINT(${coords1[0]} ${coords1[1]})'),
      ST_GeogFromText('POINT(${coords2[0]} ${coords2[1]})')
    ) as distance
  `, { type: sequelize.QueryTypes.SELECT });

  const distance = parseFloat(result[0].distance);
  console.log(`Distance entre restaurants ${restaurant1Id} et ${restaurant2Id}: ${distance}m`);
  
  return distance <= maxDistance;
};

/**
 * Vérifie si toutes les livraisons sont sur le même trajet
 * Utilise l'API OSRM pour optimiser la route
 */
export const areDeliveriesOnSameRoute = async (orderIds) => {
  try {
    // Récupérer toutes les commandes avec restaurants et destinations
    const orders = await Order.findAll({
      where: { id: orderIds },
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name', 'location']
      }]
    });

    if (orders.length < 2) {
      return true; // Une seule commande = toujours sur le même trajet
    }

    // Extraire tous les points (restaurants + destinations)
    const waypoints = [];
    const restaurantCoords = new Set();

    orders.forEach(order => {
      const restCoords = order.restaurant.location?.coordinates;
      const deliveryCoords = order.delivery_location?.coordinates;

      if (restCoords) {
        const coordKey = `${restCoords[0]},${restCoords[1]}`;
        if (!restaurantCoords.has(coordKey)) {
          waypoints.push({ lng: restCoords[0], lat: restCoords[1], type: 'pickup' });
          restaurantCoords.add(coordKey);
        }
      }

      if (deliveryCoords) {
        waypoints.push({ lng: deliveryCoords[0], lat: deliveryCoords[1], type: 'delivery' });
      }
    });

    if (waypoints.length < 2) {
      return false;
    }

    // Construire l'URL OSRM pour le trip (optimisation de route)
    const coordinates = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const url = `https://router.project-osrm.org/trip/v1/driving/${coordinates}?source=first&roundtrip=false`;

    const response = await axios.get(url);

    if (response.data.code !== 'Ok') {
      console.warn('OSRM trip failed:', response.data.code);
      return false;
    }

    // Vérifier si le détour est raisonnable
    const trip = response.data.trips[0];
    const totalDistance = trip.distance; // en mètres

    // Calculer la distance directe moyenne pour comparaison
    let directDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      directDistance += haversineDistance(
        waypoints[i].lat, waypoints[i].lng,
        waypoints[i + 1].lat, waypoints[i + 1].lng
      );
    }

    // Si la route optimisée est moins de 1.5x la distance directe, c'est acceptable
    const detourRatio = totalDistance / directDistance;
    console.log(`Détour ratio: ${detourRatio.toFixed(2)} (distance totale: ${(totalDistance / 1000).toFixed(2)}km)`);

    return detourRatio <= 1.5; // Configurable

  } catch (error) {
    console.error('Erreur vérification trajet:', error.message);
    return false; // En cas d'erreur, refuser par sécurité
  }
};

/**
 * Calcul de distance Haversine (en mètres)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Vérifie si un livreur peut accepter une nouvelle commande
 */
export const canDriverAcceptOrder = async (driverId, newOrderId) => {
  const driver = await Driver.findByPk(driverId);

  if (!driver || !driver.canAcceptMoreOrders()) {
    return {
      canAccept: false,
      reason: 'Driver not available or at max capacity'
    };
  }

  // Si c'est la première commande, toujours OK
  if (driver.active_orders.length === 0) {
    return { canAccept: true };
  }

  // Récupérer les commandes actives
  const activeOrders = await Order.findAll({
    where: { id: driver.active_orders },
    include: [{
      model: Restaurant,
      as: 'restaurant'
    }]
  });

  const newOrder = await Order.findByPk(newOrderId, {
    include: [{
      model: Restaurant,
      as: 'restaurant'
    }]
  });

  if (!newOrder) {
    return { canAccept: false, reason: 'Order not found' };
  }

  // Vérifier les distances entre restaurants
  for (const activeOrder of activeOrders) {
    const nearby = await areRestaurantsNearby(
      activeOrder.restaurant_id,
      newOrder.restaurant_id
    );

    if (!nearby) {
      return {
        canAccept: false,
        reason: `Restaurant too far from existing delivery (max 500m)`
      };
    }
  }

  // Vérifier si toutes les livraisons sont sur le même trajet
  const allOrderIds = [...driver.active_orders, newOrderId];
  const onSameRoute = await areDeliveriesOnSameRoute(allOrderIds);

  if (!onSameRoute) {
    return {
      canAccept: false,
      reason: 'Deliveries not on the same route'
    };
  }

  return { canAccept: true };
};

/**
 * Récupère la configuration max de commandes
 */
export const getMaxOrdersPerDriver = async () => {
  return await SystemConfig.get('max_orders_per_driver', 5);
};

/**
 * Met à jour la configuration max de commandes
 */
export const updateMaxOrdersPerDriver = async (maxOrders, adminId) => {
  if (maxOrders < 1 || maxOrders > 10) {
    throw new Error('Max orders must be between 1 and 10');
  }

  const config = await SystemConfig.set(
    'max_orders_per_driver',
    maxOrders,
    adminId,
    'Maximum number of orders a driver can handle simultaneously'
  );

  // Mettre à jour tous les livreurs
  await Driver.update(
    { max_orders_capacity: maxOrders },
    { where: {} }
  );

  return config;
};