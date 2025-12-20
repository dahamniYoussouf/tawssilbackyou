import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";
import * as announcementCtrl from "../controllers/announcement.controller.js";
import {
  createAnnouncementValidator,
  updateAnnouncementValidator,
  deleteAnnouncementValidator
} from "../validators/announcementValidator.js";

const router = Router();

router.post("/create", createAnnouncementValidator, validate, announcementCtrl.create);
router.put("/update/:id", updateAnnouncementValidator, validate, announcementCtrl.update);
router.delete("/delete/:id", deleteAnnouncementValidator, validate, announcementCtrl.remove);
router.get("/getall", cacheMiddleware({ ttl: 300 }), announcementCtrl.getAll);
router.get("/getactive", cacheMiddleware({ ttl: 300 }), announcementCtrl.getActive);

export default router;
