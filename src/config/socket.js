import { Server } from "socket.io";
import sequelize from "../config/database.js";
import jwt from "jsonwebtoken";
import Restaurant from "../models/Restaurant.js";
import Driver from "../models/Driver.js";
import Client from "../models/Client.js"; 
import Admin from "../models/Admin.js";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // ========================================
  // AUTHENTICATION MIDDLEWARE
  // ========================================
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // Allow guest connections
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.clientProfileId = decoded.client_id;
      socket.driverProfileId = decoded.driver_id;
      socket.restaurantProfileId = decoded.restaurant_id;
      socket.adminProfileId = decoded.admin_id;
    } catch (err) {
      console.warn("❌ Invalid socket token:", err.message);
    }
    next();
  });

  // ========================================
  // CONNECTION HANDLER
  // ========================================
  io.on("connection", async (socket) => {
    console.log(`✅ Connected: ${socket.id} | Role: ${socket.userRole || 'guest'}`);

    // Only proceed if authenticated
    if (!socket.userId || !socket.userRole) {
      console.log(`⚠️ Guest connection (no token): ${socket.id}`);
      return;
    }

    // ========================================
    // AUTO-JOIN ROOMS
    // ========================================
    try {
      // Join role-based room
      socket.join(socket.userRole);

      // CLIENT
      if (socket.userRole === "client") {
        const client = await Client.findOne({ where: { user_id: socket.userId } });
        if (client) {
          socket.join(`client:${client.id}`);
          socket.clientProfileId = client.id;
          console.log(`👤 Client joined: client:${client.id}`);
        }
      }

      // RESTAURANT
      if (socket.userRole === "restaurant") {
        const restaurant = await Restaurant.findOne({ where: { user_id: socket.userId } });
        if (restaurant) {
          socket.join(`restaurant:${restaurant.id}`);
          socket.restaurantProfileId = restaurant.id;
          console.log(`🍴 Restaurant joined: restaurant:${restaurant.id}`);
        }
      }

      // DRIVER
      if (socket.userRole === "driver") {
        const driver = await Driver.findOne({ where: { user_id: socket.userId } });
        if (driver) {
          socket.join(`driver:${driver.id}`);
          socket.join("drivers"); // Global pool
          socket.driverProfileId = driver.id;
          
          // ✅ Update status to 'available' when connected
          if (driver.status === 'offline') {
            await driver.update({
              status: 'available',
              last_active_at: new Date()
            });
            console.log(`🟢 Driver ${driver.id} status → available`);
          }
          
          console.log(`🛵 Driver joined: driver:${driver.id}`);
        }
      }

      // ADMIN
      if (socket.userRole === "admin") {
        const admin = await Admin.findOne({ where: { user_id: socket.userId } });
        if (admin) {
          socket.join("admin");
          socket.join("admins");
          socket.adminProfileId = admin.id;
          console.log(`👮 Admin joined: admin`);
        }
      }

    } catch (error) {
      console.error(`❌ Error during connection setup for ${socket.id}:`, error);
    }

    // ========================================
    // DISCONNECT HANDLER
    // ========================================
    socket.on("disconnect", async (reason) => {
      console.log(`❌ Disconnected: ${socket.id} | Reason: ${reason}`);

      // ✅ If driver, set status to offline
      if (socket.userRole === 'driver' && socket.driverProfileId) {
        try {
          const driver = await Driver.findByPk(socket.driverProfileId);
          
          if (driver) {
            // Only set offline if not in active delivery
            if (driver.status !== 'busy' || !driver.active_order_id) {
              await driver.update({
                status: 'offline',
                last_active_at: new Date()
              });
              console.log(`🔴 Driver ${driver.id} status → offline`);
            } else {
              console.log(`⚠️ Driver ${driver.id} disconnected but has active order`);
            }
          }
        } catch (error) {
          console.error(`❌ Error updating driver status:`, error);
        }
      }
    });

  }); // End of io.on("connection")

  return io;
}

// ========================================
// EXPORTS FOR SERVICES
// ========================================

export function getIO() {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized');
  }
  return io;
}

/**
 * Emit event to a specific room
 * @param {string} room - Room name (e.g., 'client:123', 'drivers')
 * @param {string} event - Event name (e.g., 'notification', 'order_update')
 * @param {object} data - Data to send
 */
export function emit(room, event, data) {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized');
    return;
  }
  console.log(`📤 [${event}] → Room: ${room}`);
  io.to(room).emit(event, data);
}

// ========================================
// NOTIFY NEARBY DRIVERS - FIXED VERSION
// ========================================

export async function notifyNearbyDrivers(orderLat, orderLng, data, radius = 5) {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized');
    return [];
  }

  const radiusMeters = radius * 1000;

  console.log(`🔍 Searching nearby drivers within ${radius} km`);
  console.log(`📍 Order location: [${orderLat}, ${orderLng}]`);

  try {
    // ✅ FIX 1: Correction de la requête SQL
    const nearbyDrivers = await Driver.findAll({
      where: sequelize.literal(`
        status = 'available'
        AND is_active = true
        AND is_verified = true
        AND current_location IS NOT NULL
        AND (
          active_orders = '{}'::uuid[] 
          OR array_length(active_orders, 1) IS NULL 
          OR array_length(active_orders, 1) < max_orders_capacity
        )
        AND ST_DWithin(
          current_location,
          ST_GeogFromText('POINT(${orderLng} ${orderLat})'),
          ${radiusMeters}
        )
      `),
      attributes: {
        include: [
          [
            sequelize.literal(`
              ST_Distance(
                current_location,
                ST_GeogFromText('POINT(${orderLng} ${orderLat})')
              )
            `),
            'distance_meters'
          ]
        ]
      },
      order: [[sequelize.literal('distance_meters'), 'ASC']]
    });

    console.log(`✅ SQL Query returned ${nearbyDrivers.length} drivers`);

    // ✅ FIX 2: Vérification simplifiée et logs détaillés
    let notifiedCount = 0;
    for (const driver of nearbyDrivers) {
      const distance = (driver.getDataValue('distance_meters') / 1000).toFixed(2);
      const driverRoom = `driver:${driver.id}`;

      // Vérifier si le driver est vraiment connecté
      const socketsInRoom = io.sockets.adapter.rooms.get(driverRoom);
      const isConnected = socketsInRoom && socketsInRoom.size > 0;

      if (!isConnected) {
        console.log(`⚠️ Driver ${driver.id} not connected to Socket.IO (room: ${driverRoom})`);
        continue;
      }

      // Vérifier la capacité (simplifiée)
      const activeOrdersCount = driver.active_orders ? driver.active_orders.length : 0;
      if (activeOrdersCount >= driver.max_orders_capacity) {
        console.log(`⚠️ Driver ${driver.id} at max capacity (${activeOrdersCount}/${driver.max_orders_capacity})`);
        continue;
      }

      const notificationData = {
        ...data,
        distance,
        distance_km: parseFloat(distance),
        remaining_capacity: driver.max_orders_capacity - activeOrdersCount,
        driver_current_orders: activeOrdersCount,
        timestamp: new Date().toISOString()
      };

      // ✅ FIX 3: Émission avec confirmation
      io.to(driverRoom).emit('new_delivery', notificationData);
      notifiedCount++;
      
      console.log(`📢 NOTIFIED driver ${driver.id}:`);
      console.log(`   - Distance: ${distance} km`);
      console.log(`   - Orders: ${activeOrdersCount}/${driver.max_orders_capacity}`);
      console.log(`   - Room: ${driverRoom} (${socketsInRoom.size} socket(s))`);
    }

    console.log(`✅ Successfully notified ${notifiedCount}/${nearbyDrivers.length} drivers`);

    return nearbyDrivers;

  } catch (error) {
    console.error('❌ Error in notifyNearbyDrivers:', error);
    return [];
  }
}

// ========================================
// DEBUG HELPERS
// ========================================

export function getClientsInRoom(room) {
  if (!io) return [];
  const clients = io.sockets.adapter.rooms.get(room);
  return clients ? Array.from(clients) : [];
}

export function getOnlineDriversCount() {
  if (!io) return 0;
  const driversRoom = io.sockets.adapter.rooms.get('drivers');
  return driversRoom ? driversRoom.size : 0;
}

export function debugRooms() {
  if (!io) {
    console.log('⚠️ Socket.IO not initialized');
    return;
  }
  
  console.log('\n=== ACTIVE SOCKET ROOMS ===');
  for (const [room, sockets] of io.sockets.adapter.rooms) {
    // Skip individual socket ID rooms
    if (!io.sockets.sockets.has(room)) {
      console.log(`  ${room} | ${sockets.size} client(s)`);
    }
  }
  console.log('===========================\n');
}