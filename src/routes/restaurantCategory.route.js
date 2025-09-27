import { Router } from "express";
import { createRestaurantCategoryValidator, updateRestaurantCategoryValidator, deleteRestaurantCategoryValidator } from "../validators/restaurantCategoryValidator.js";
import { validate } from "../middlewares/validate.js";
import * as restaurantCategoryCtrl from "../controllers/restaurantCategory.controller.js";

const router = Router();

router.post("/create", createRestaurantCategoryValidator, validate, restaurantCategoryCtrl.create);
router.put("/update/:id", updateRestaurantCategoryValidator, validate, restaurantCategoryCtrl.update);
router.delete("/delete/:id", deleteRestaurantCategoryValidator, validate, restaurantCategoryCtrl.remove);
router.get("/getall", restaurantCategoryCtrl.getAll);

export default router;
