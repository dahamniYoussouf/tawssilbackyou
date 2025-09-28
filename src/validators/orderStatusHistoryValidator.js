
// validators/orderStatusHistoryValidator.js
import { param } from "express-validator";

export const getOrderHistoryValidator = [
  param("orderId")
    .isUUID()
    .withMessage("L'ID de commande doit être un UUID valide")
];