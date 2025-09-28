import express from "express";
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
import restaurantcategory from "./routes/restaurantCategory.route.js";
import menuitem from "./routes/menuItem.route.js";
import order from "./routes/order.route.js";
import orderstatushistory from "./routes/orderStatusHistory.route.js";
import orderitem from "./routes/orderItem.route.js";
import client from "./routes/client.route.js";
import announcement from "./routes/announcement.route.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import geocodeRoutes from "./routes/geocode.js";

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOutput));


// Base middlewares
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Security middlewares (helmet + rate limit)
app.use(securityMiddlewares);

// Health check route
app.get("/health", (_, res) => res.send("OK"));

// Routes
app.use("/restaurant", restaurant);
app.use("/foodcategory", foodcategory);
app.use("/restaurantcategory", restaurantcategory);
app.use("/menuitem", menuitem);
app.use("/order", order);
app.use("/orderstatushistory", orderstatushistory);
app.use("/orderitem", orderitem);
app.use("/client", client);
app.use("/announcement", announcement);
app.use("/api", uploadRoutes);
app.use("/api", geocodeRoutes);

// Error + 404 handlers
app.use(errorHandler);
app.use("*", notFoundHandler);

export default app;
