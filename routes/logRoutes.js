import express from "express";
import {
  upsertLog,
  getTodayLog,
  getLogsByRange,
  getRecentSummary,
  getLogByDate,
  deleteLog,
} from "../controllers/logController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", upsertLog);
router.get("/today", getTodayLog);
router.get("/range", getLogsByRange);
router.get("/summary", getRecentSummary);
router.get("/:date", getLogByDate);
router.delete("/:date", deleteLog);

export default router;
