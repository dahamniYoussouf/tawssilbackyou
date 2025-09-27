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
import menuitem from "./routes/menuItem.route.js";
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
app.use("/menuitem", menuitem);
app.use("/api", uploadRoutes);
app.use("/api", geocodeRoutes);

// Error + 404 handlers
app.use(errorHandler);
app.use("*", notFoundHandler);

export default app;
