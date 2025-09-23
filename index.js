import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import restaurant from "./src/routes/restaurant.js";
import uploadRoutes from "./src/routes/uploadRoutes.js";
import geocodeRoutes from "./src/routes/geocode.js";  

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use("/restaurant", restaurant);
app.use("/api", uploadRoutes);
app.use("/api", geocodeRoutes);  

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("✅ App listening on port " + port);
});