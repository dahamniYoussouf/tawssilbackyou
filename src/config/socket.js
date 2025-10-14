import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Restaurant from "../models/Restaurant.js";
import Driver from "../models/Driver.js";
import Client from "../models/Client.js"; // ← IMPORTANT: Import Client model

let io;
const driverLocations = new Map();

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  // Authenticate sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // allow guests
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
    } catch (err) {
      console.warn("❌ Invalid socket token:", err.message);
    }
    next();
  });

  // Connection handler
  io.on("connection", async (socket) => {
    console.log("✅ User connected:", socket.id, "Role:", socket.userRole);

    // --- Authenticated user joins their personal and role-based rooms
    if (socket.userId && socket.userRole) {
      // Join user-based room (for admin purposes)
      const userRoom = `${socket.userRole}:${socket.userId}`;
      socket.join(userRoom);
      console.log(`➡️ Joined user room: ${userRoom}`);

      // Join general role room
      socket.join(socket.userRole);

      // --- CLIENT: Join client profile room (THIS IS THE FIX!)
      if (socket.userRole === "client") {
        try {
          const client = await Client.findOne({ where: { user_id: socket.userId } });
          if (client) {
            const clientProfileRoom = `client:${client.id}`;
            socket.join(clientProfileRoom);
            console.log(`👤 Client joined profile room: ${clientProfileRoom}`);
            console.log(`   User ID: ${socket.userId}, Profile ID: ${client.id}`);
            
            // Store for reference
            socket.clientProfileId = client.id;
            
            // Send confirmation to client
            socket.emit('notification', {
              type: 'connection_success',
              message: `Connected! Listening for orders on client:${client.id}`
            });
          } else {
            console.warn(`⚠️ No client profile found for user ${socket.userId}`);
          }
        } catch (e) {
          console.error("Error joining client room:", e);
        }
      }

      // --- RESTAURANT: Join restaurant profile room
      if (socket.userRole === "restaurant") {
        try {
          const restaurant = await Restaurant.findOne({ where: { user_id: socket.userId } });
          if (restaurant) {
            const restaurantRoom = `restaurant:${restaurant.id}`;
            socket.join(restaurantRoom);
            console.log(`🍴 Restaurant joined profile room: ${restaurantRoom}`);
            console.log(`   User ID: ${socket.userId}, Restaurant ID: ${restaurant.id}`);
            
            socket.restaurantProfileId = restaurant.id;
          } else {
            console.warn(`⚠️ No restaurant found for user ${socket.userId}`);
          }
        } catch (e) {
          console.error("Error joining restaurant room:", e);
        }
      }

      // --- DRIVER: Join driver profile room and global pool
      if (socket.userRole === "driver") {
        try {
          const driver = await Driver.findOne({ where: { user_id: socket.userId } });
          if (driver) {
            const driverRoom = `driver:${driver.id}`;
            socket.join(driverRoom);
            socket.join("drivers"); // Global pool
            console.log(`🛵 Driver joined profile room: ${driverRoom}`);
            console.log(`   User ID: ${socket.userId}, Driver ID: ${driver.id}`);
            
            socket.driverProfileId = driver.id;
          } else {
            console.warn(`⚠️ No driver profile found for user ${socket.userId}`);
          }
        } catch (e) {
          console.error("Error joining driver room:", e);
        }
      }
    }

    // --- Manual join (for testing)
    socket.on("join", (room) => {
      socket.join(room);
      console.log(`Manual join → ${room}`);
    });

    // --- Driver online / updates
    socket.on("driver_online", async ({ driverId, lat, lng }) => {
      console.log(`🟢 Driver going online: driverId=${driverId}, lat=${lat}, lng=${lng}`);
      
      const driver = await Driver.findByPk(driverId);
      
      if (driver) {
        // Store with availability = true by default
        driverLocations.set(driver.user_id, { 
          lat, 
          lng, 
          socketId: socket.id,
          isAvailable: true,
          profileId: driverId
        });
        
        socket.join("drivers");
        console.log(`✅ Driver stored: user_id=${driver.user_id}, available=true`);
        console.log(`📊 Total online drivers: ${driverLocations.size}`);
      } else {
        console.error(`❌ Driver profile ${driverId} not found in database`);
      }
    });

    // Update location also updates availability
    socket.on("update_location", async ({ driverId, lat, lng }) => {
      const driver = await Driver.findByPk(driverId);
      
      if (driver) {
        const existing = driverLocations.get(driver.user_id);
        if (existing) {
          driverLocations.set(driver.user_id, {
            ...existing,
            lat,
            lng,
            isAvailable: driver.status === 'available' && !driver.active_order_id
          });
        }
      }
    });

    // --- Driver offline
    socket.on("driver_offline", ({ driverId }) => {
      const driver = driverLocations.get(driverId);
      if (driver) {
        driverLocations.delete(driverId);
        console.log(`🔴 Driver ${driverId} went offline`);
      }
    });

    // --- Disconnect cleanup
    socket.on("disconnect", () => {
      // Clean up driver locations
      for (const [driverId, data] of driverLocations.entries()) {
        if (data.socketId === socket.id) {
          driverLocations.delete(driverId);
          console.log(`🔴 Driver ${driverId} offline (disconnect)`);
        }
      }
      console.log("❌ User disconnected:", socket.id);
    });
  });

  return io;
}

/* -------- Exports for services -------- */
export function getIO() {
  return io;
}

export function emit(room, event, data) {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized');
    return;
  }
  console.log(`📤 Emitting '${event}' to room '${room}':`, data);
  io.to(room).emit(event, data);
}

/* -------- Notify near driver -------- */

export async function notifyNearbyDrivers(orderLat, orderLng, data, radius = 10) {
  // radius en kilomètres → conversion en mètres
  const radiusMeters = radius * 1000;

  console.log(`🔍 Searching nearby drivers within ${radius} km via PostGIS query`);

  // Trouver les drivers disponibles dans la zone via ST_DWithin
  const nearbyDrivers = await Driver.findAll({
    where: sequelize.literal(`
      status = 'available'
      AND active_order_id IS NULL
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
    }
  });

  // 🔔 Notification en temps réel via Socket.IO
  for (const driver of nearbyDrivers) {
    const distance = (driver.getDataValue('distance_meters') / 1000).toFixed(2);
    const driverRoom = `driver:${driver.id}`;

    io.to(driverRoom).emit('new_delivery', {
      ...data,
      distance
    });

    console.log(`📢 Notified driver ${driver.id} (${distance} km away)`);
  }

  console.log(`✅ ${nearbyDrivers.length} drivers notified within ${radius} km`);
  return nearbyDrivers;
}

// Helper to get all connected clients in a room (for debugging)
export function getClientsInRoom(room) {
  if (!io) return [];
  return Array.from(io.sockets.adapter.rooms.get(room) || []);
}

// Debug function to list all active rooms
export function debugRooms() {
  if (!io) return;
  console.log('\n=== ACTIVE SOCKET ROOMS ===');
  for (const [room, sockets] of io.sockets.adapter.rooms) {
    // Skip socket ID rooms (they're auto-created)
    if (!io.sockets.sockets.has(room)) {
      console.log(`Room: ${room} | Clients: ${sockets.size}`);
    }
  }
  console.log('========================\n');
}