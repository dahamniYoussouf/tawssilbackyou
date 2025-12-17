import { Router } from "express";
import { protect, isClient } from "../middlewares/auth.js";
import { nearbyFilterValidator } from "../validators/restaurantValidator.js";
import { validate } from "../middlewares/validate.js";
import {
  getHomepageOverview,
  getHomepageModulesForClient,
  postHomepageModulesForClient
} from "../controllers/homepage.controller.js";

const router = Router();

router.post(
  "/overview",
  protect,
  isClient,
  nearbyFilterValidator,
  validate,
  getHomepageOverview
);

router.post(
  "/",
  nearbyFilterValidator,
  validate,
  postHomepageModulesForClient
);

export default router;
