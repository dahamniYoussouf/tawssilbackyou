import { Router } from "express";
import { createRestaurantValidator, nearbyRestaurantValidator, deleteRestaurantValidator, updateRestaurantValidator } from "../validators/restaurantValidator.js";
import { validate } from "../middlewares/validate.js";
import * as restaurantCtrl from "../controllers/restaurant.controller.js";

const router = Router();

router.post("/create", createRestaurantValidator, validate, restaurantCtrl.create);
router.put("/update/:id", updateRestaurantValidator, validate, restaurantCtrl.update);
router.delete("/delete/:id", deleteRestaurantValidator, validate, restaurantCtrl.remove);
router.get("/nearby", nearbyRestaurantValidator, validate, restaurantCtrl.nearby);
router.get("/getall", restaurantCtrl.getAll);


export default router;
