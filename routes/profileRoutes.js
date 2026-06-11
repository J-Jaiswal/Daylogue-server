import express from "express";
import {
  getProfile,
  updateProfile,
  updatePhase,
  getPhaseHistory,
} from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getProfile);
router.put("/update", updateProfile);
router.put("/phase", updatePhase);
router.get("/phases", getPhaseHistory);

export default router;
