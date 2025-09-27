import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import * as clientCtrl from "../controllers/client.controller.js";
import {
  createClientValidator,
  updateClientValidator,
  deleteClientValidator
} from "../validators/clientValidator.js";

const router = Router();

router.post("/create", createClientValidator, validate, clientCtrl.create);
router.put("/update/:id", updateClientValidator, validate, clientCtrl.update);
router.delete("/delete/:id", deleteClientValidator, validate, clientCtrl.remove);
router.get("/getall", clientCtrl.getAll);

export default router;
