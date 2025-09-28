import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import * as orderStatusHistoryCtrl from "../controllers/orderStatusHistory.controller.js";
import {
  getOrderHistoryValidator
} from "../validators/orderStatusHistoryValidator.js";

const router = Router();

// Récupérer l'historique d'une commande
router.get("/order/:orderId", getOrderHistoryValidator, validate, orderStatusHistoryCtrl.getOrderHistory);

// Récupérer tous les historiques
router.get("/getall", orderStatusHistoryCtrl.getAll);

export default router;