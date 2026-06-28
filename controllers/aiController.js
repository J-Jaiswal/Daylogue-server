import {
  getDailySuggestions,
  getWeeklyReview,
  chatWithAI,
} from "../services/aiService.js";
import WeeklyReview from "../models/WeeklyReview.js";
import { getWeekStartString } from "../utils/dateUtils.js";

export const dailySuggestions = async (req, res, next) => {
  try {
    const suggestions = await getDailySuggestions(req.userId);
    res.status(200).json({ success: true, suggestions });
  } catch (err) {
    next(err);
  }
};

export const weeklyReview = async (req, res, next) => {
  try {
    const review = await getWeeklyReview(req.userId);
    res.status(200).json({ success: true, review });
  } catch (err) {
    next(err);
  }
};

export const deleteWeeklyReview = async (req, res, next) => {
  try {
    const weekStart = getWeekStartString();
    await WeeklyReview.findOneAndDelete({ userId: req.userId, weekStartDate: weekStart });
    res.status(200).json({ success: true, message: "Weekly review cache cleared" });
  } catch (err) {
    next(err);
  }
};

export const chat = async (req, res, next) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "message is required" });
    }

    const reply = await chatWithAI(
      req.userId,
      message,
      conversationHistory || [],
    );
    res.status(200).json({ success: true, reply });
  } catch (err) {
    next(err);
  }
};
