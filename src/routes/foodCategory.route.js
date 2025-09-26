import { Router } from "express";
import { createFoodCategoryValidator, updateFoodCategoryValidator, deleteFoodCategoryValidator } from "../validators/foodCategoryValidator.js";
import { validate } from "../middlewares/validate.js";
import * as foodCategoryCtrl from "../controllers/foodCategory.controller.js";

const router = Router();

router.post("/create", createFoodCategoryValidator, validate, foodCategoryCtrl.create);
router.put("/update/:id", updateFoodCategoryValidator, validate, foodCategoryCtrl.update);
router.delete("/delete/:id", deleteFoodCategoryValidator, validate, foodCategoryCtrl.remove);
router.get("/getall", foodCategoryCtrl.getAll);

export default router;
