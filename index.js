import "./processHandlers.js";
import dotenv from "dotenv";
import { server } from "./src/app.js"; // ⚡ Import server instead of app
import { sequelize } from "./src/config/database.js";

dotenv.config();

const port = process.env.PORT || 3000;

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established");


    // Start HTTP server with Socket.IO
    server.listen(port, () => {
      console.log("✅ App listening on port " + port);
      console.log(`📚 API Docs: http://localhost:${port}/api-docs`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();