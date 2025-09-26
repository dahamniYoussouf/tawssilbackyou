import { Router } from "express";
import {
  createMenuItemValidator,
  updateMenuItemValidator,
  deleteMenuItemValidator
} from "../validators/menuItemValidator.js";
import { validate } from "../middlewares/validate.js";
import * as menuItemCtrl from "../controllers/menuItem.controller.js";

const router = Router();

router.post("/create", createMenuItemValidator, validate, menuItemCtrl.create);
router.put("/update/:id", updateMenuItemValidator, validate, menuItemCtrl.update);
router.delete("/delete/:id", deleteMenuItemValidator, validate, menuItemCtrl.remove);
router.get("/getall", menuItemCtrl.getAll);

export default router;
