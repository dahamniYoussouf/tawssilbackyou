import express from "express";
import http from "http";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import bodyParser from "body-parser";
import { readFileSync } from 'fs';

const swaggerOutput = JSON.parse(readFileSync('./swagger-output.json', 'utf8'));

import { securityMiddlewares } from "./middlewares/security.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

import "./models/index.js";

import restaurant from "./routes/restaurant.route.js";
import foodcategory from "./routes/foodCategory.route.js";
import menuitem from "./routes/menuItem.route.js";
import order from "./routes/order.route.js";
import orderitem from "./routes/orderItem.route.js";
import client from "./routes/client.route.js";
import announcement from "./routes/announcement.route.js";
import favoriteRestaurant from "./routes/favoriteRestaurant.route.js";
import favoriteMeal from "./routes/favoriteMeal.route.js";
import driver from "./routes/driver.routes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import geocodeRoutes from "./routes/geocode.js";

const app = express();

// ⚡ CREATE HTTP SERVER (Required for Socket.IO)
const server = http.createServer(app);


// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOutput));

// CORS configuration (update for Socket.IO support)
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Base middlewares
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Security middlewares (helmet + rate limit)
app.use(securityMiddlewares);

// Health check route (updated to include socket status)
app.get("/health", (_, res) => {
  res.json({ 
    status: "OK",
    socket: io ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/restaurant", restaurant);
app.use("/foodcategory", foodcategory);
app.use("/menuitem", menuitem);
app.use("/order", order);
app.use("/orderitem", orderitem);
app.use("/client", client);
app.use("/announcement", announcement);
app.use("/favoriterestaurant", favoriteRestaurant);
app.use("/favoritemeal", favoriteMeal);
app.use("/driver", driver);
app.use("/api", uploadRoutes);
app.use("/api", geocodeRoutes);

// Error + 404 handlers
app.use(errorHandler);
app.use("*", notFoundHandler);

// ⚡ EXPORT BOTH APP AND SERVER
export { app, server };
export default server;