import { Router } from "express";
import { createRestaurantValidator, nearbyRestaurantValidator, deleteRestaurantValidator, updateRestaurantValidator, nearbyFilterValidator } from "../validators/restaurantValidator.js";
import { validate } from "../middlewares/validate.js";
import * as restaurantCtrl from "../controllers/restaurant.controller.js";

const router = Router();

router.post("/create", createRestaurantValidator, validate, restaurantCtrl.create);
router.put("/update/:id", updateRestaurantValidator, validate, restaurantCtrl.update);
router.delete("/delete/:id", deleteRestaurantValidator, validate, restaurantCtrl.remove);
router.post("/nearbyfilter",nearbyFilterValidator, validate, restaurantCtrl.nearbyFilter);
router.post("/getnearbynames",nearbyFilterValidator, validate, restaurantCtrl.getNearbyNames);
router.get("/getall", restaurantCtrl.getAll);
router.get('/details/:restaurantId', restaurantCtrl.getRestaurantMenu);



export default router;
