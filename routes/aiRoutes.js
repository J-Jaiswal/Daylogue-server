import express from "express";
import {
  dailySuggestions,
  weeklyReview,
  chat,
  deleteWeeklyReview,
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/daily", dailySuggestions);
router.get("/weekly", weeklyReview);
router.delete("/weekly", deleteWeeklyReview);
router.post("/chat", chat);

export default router;
