import express from "express";
import {
  create,
  getAll,
  getById,
  update,
  remove,
  updateStatus,
  getAvailable,
  getStatistics
} from "../controllers/driver.controller.js";

const router = express.Router();

// Basic CRUD
router.post("/create", create);
router.get("/getall", getAll);
router.get("/getavailable", getAvailable);
router.get("/:id", getById);
router.put("/update/:id", update);
router.delete("/delete/:id", remove);

// Driver-specific operations
router.patch("/:id/status", updateStatus);
router.get("/:id/statistics", getStatistics);

export default router;