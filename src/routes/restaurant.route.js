import { Router } from "express";
import { createRestaurantValidator, nearbyRestaurantValidator, deleteRestaurantValidator, updateRestaurantValidator, nearbyByAddressValidator } from "../validators/restaurantValidator.js";
import { validate } from "../middlewares/validate.js";
import * as restaurantCtrl from "../controllers/restaurant.controller.js";

const router = Router();

router.post("/create", createRestaurantValidator, validate, restaurantCtrl.create);
router.put("/update/:id", updateRestaurantValidator, validate, restaurantCtrl.update);
router.delete("/delete/:id", deleteRestaurantValidator, validate, restaurantCtrl.remove);
router.get("/nearby", nearbyRestaurantValidator, validate, restaurantCtrl.nearby);
router.get("/nearbyFilter", restaurantCtrl.nearbyfilter);
router.get("/getall", restaurantCtrl.getAll);
router.get("/nearbybyaddress",nearbyByAddressValidator, restaurantCtrl.nearbyByAddress);



export default router;
