import express from "express";
import http from "http";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import bodyParser from "body-parser";
import { readFileSync } from 'fs';
import { initSocket } from "./config/socket.js";

const swaggerOutput = JSON.parse(readFileSync('./swagger-output.json', 'utf8'));

import { securityMiddlewares } from "./middlewares/security.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

import "./models/index.js";

// Import routes
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
import auth from "./routes/auth.route.js";
import admin from "./routes/admin.routes.js"; 


const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOutput));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityMiddlewares);

app.get("/health", (_, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes
app.use("/auth", auth);
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
app.use("/admin", admin);
app.use("/api", uploadRoutes);
app.use("/api", geocodeRoutes);

app.use("/client/*", notFoundHandler);

app.use("/api/v1/auth", auth);
app.use("/api/v1/restaurants", restaurant);
app.use("/api/v1/food-categories", foodcategory);
app.use("/api/v1/menu-items", menuitem);
app.use("/api/v1/orders", order);
app.use("/api/v1/order-items", orderitem);
app.use("/api/v1/clients", client);
app.use("/api/v1/announcements", announcement);
app.use("/api/v1/favorite-restaurants", favoriteRestaurant);
app.use("/api/v1/favorite-meals", favoriteMeal);
app.use("/api/v1/drivers", driver);
app.use("/api/v1/admin", admin);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/geocode", geocodeRoutes);

app.use(express.static("public"));

app.use(errorHandler);
app.use("*", notFoundHandler);

export { server };
export default server;