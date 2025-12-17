import { Router } from "express";
import { protect, isClient } from "../middlewares/auth.js";
import { nearbyFilterValidator } from "../validators/restaurantValidator.js";
import { validate } from "../middlewares/validate.js";
import { streamHomepageOverview } from "../controllers/homepage.v2.controller.js";

const router = Router();

router.post(
  "/overview/stream",
  protect,
  isClient,
  nearbyFilterValidator,
  validate,
  streamHomepageOverview
);

export default router;
