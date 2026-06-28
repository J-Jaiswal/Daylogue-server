import express from "express";
import {
  startSleep,
  completeSleep,
  cancelSleep,
  getActiveSleep,
  addNap,
  deleteNap,
} from "../controllers/sleepController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/start", startSleep);
router.post("/complete", completeSleep);
router.post("/cancel", cancelSleep);
router.get("/active", getActiveSleep);
router.post("/nap", addNap);
router.delete("/nap/:napId", deleteNap);

export default router;
