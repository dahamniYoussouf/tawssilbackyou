import { Router } from "express";
import { validate } from "../middlewares/validate.js";
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
router.get("/getall", announcementCtrl.getAll);
router.get("/getactive", announcementCtrl.getActive);

export default router;