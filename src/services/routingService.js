import axios from 'axios';

/**
 * Calculate route distance and travel time between two coordinates
 * @param {number} startLng - Starting longitude
 * @param {number} startLat - Starting latitude
 * @param {number} endLng - Destination longitude
 * @param {number} endLat - Destination latitude
 * @param {number} speedKmh - Motor speed in km/h (default: 40)
 * @returns {Object} Route info with distance and time estimates
 */
const calculateRouteTime = async (startLng, startLat, endLng, endLat, speedKmh = 40) => {
  try {
    // Get actual route from OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;
    const response = await axios.get(url);

    const distanceKm = response.data.routes[0].distance / 1000;
    const timeMinutes = (distanceKm / speedKmh) * 60;
    
    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      timeMin: Math.floor(timeMinutes * 0.9),  // optimistic
      timeMax: Math.ceil(timeMinutes * 1.2)    // with delays
    };
  } catch (error) {
    // Fallback to straight-line distance × 1.3
    const R = 6371;
    const dLat = (endLat - startLat) * Math.PI / 180;
    const dLon = (endLng - startLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.3;
    const timeMinutes = (distanceKm / speedKmh) * 60;
    
    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      timeMin: Math.floor(timeMinutes * 0.9),
      timeMax: Math.ceil(timeMinutes * 1.2)
    };
  }
};

export default calculateRouteTime;