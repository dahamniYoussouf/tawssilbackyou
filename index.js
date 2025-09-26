import "./processHandlers.js";
import dotenv from "dotenv";
import app from "./src/app.js";

dotenv.config();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("✅ App listening on port " + port);
});
