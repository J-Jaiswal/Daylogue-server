import DailyLog from "../models/DailyLog.js";
import User from "../models/User.js";
import { calculateSleepDuration, getTodayString } from "../utils/dateUtils.js";

// POST /api/logs — create or patch today's log
export const upsertLog = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { date, sleep, workouts, meals, mood, naps } = req.body;

    const logDate = date || getTodayString();

    // fetch phase snapshot from user at time of logging
    const user = await User.findById(userId).select("currentPhase");
    const phaseSnapshot = user.currentPhase;

    // sleep data is passed through directly from front-end
    let sleepData = sleep;

    const existing = await DailyLog.findOne({ userId, date: logDate });

    if (existing) {
      // patch — only update fields that were sent in the request body
      if (req.body.hasOwnProperty("sleep")) existing.sleep = sleep;
      if (req.body.hasOwnProperty("workouts")) existing.workouts = workouts;
      if (req.body.hasOwnProperty("meals")) existing.meals = meals;
      if (req.body.hasOwnProperty("mood")) existing.mood = mood;
      if (req.body.hasOwnProperty("naps")) existing.naps = naps;
      existing.phaseSnapshot = phaseSnapshot;

      await existing.save();
      return res.status(200).json({ success: true, log: existing });
    }

    const log = await DailyLog.create({
      userId,
      date: logDate,
      sleep: sleepData,
      workouts: workouts || [],
      meals: meals || [],
      naps: naps || [],
      mood,
      phaseSnapshot,
    });

    res.status(201).json({ success: true, log });
  } catch (err) {
    next(err);
  }
};

// GET /api/logs/:date — fetch a specific day's log
export const getLogByDate = async (req, res, next) => {
  try {
    const { date } = req.params; // expects "YYYY-MM-DD"
    const log = await DailyLog.findOne({ userId: req.userId, date });

    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "No log found for this date" });
    }

    res.status(200).json({ success: true, log });
  } catch (err) {
    next(err);
  }
};

// GET /api/logs/today — convenience route for today's log
export const getTodayLog = async (req, res, next) => {
  try {
    const today = getTodayString();
    const log = await DailyLog.findOne({ userId: req.userId, date: today });

    // return empty structure if no log yet today, frontend handles it gracefully
    if (!log) {
      return res.status(200).json({
        success: true,
        log: null,
        message: "No log yet for today",
      });
    }

    res.status(200).json({ success: true, log });
  } catch (err) {
    next(err);
  }
};

// GET /api/logs/range?start=YYYY-MM-DD&end=YYYY-MM-DD — for history page
export const getLogsByRange = async (req, res, next) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res
        .status(400)
        .json({
          success: false,
          message: "start and end query params required",
        });
    }

    const logs = await DailyLog.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    res.status(200).json({ success: true, logs });
  } catch (err) {
    next(err);
  }
};

// GET /api/logs/summary — last 7 days aggregated, used for LLM context and momentum
export const getRecentSummary = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    // build date range
    const end = getTodayString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const start = startDate.toISOString().split("T")[0];

    const logs = await DailyLog.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    if (!logs.length) {
      return res.status(200).json({ success: true, summary: null, logs: [] });
    }

    // aggregate stats
    const totalDays = logs.length;

    const sleepLogs = logs.filter((l) => l.sleep?.duration);
    const avgSleepMinutes = sleepLogs.length
      ? Math.round(
        sleepLogs.reduce((sum, l) => sum + l.sleep.duration, 0) /
        sleepLogs.length,
      )
      : null;

    const totalWorkoutSessions = logs.reduce(
      (sum, l) => sum + (l.workouts?.length || 0),
      0,
    );

    const allMeals = logs.flatMap((l) => l.meals || []);
    const junkFoodCount = allMeals.filter(
      (m) => m.category === "junk_food",
    ).length;
    const cheatMealCount = allMeals.filter(
      (m) => m.category === "cheat_meal",
    ).length;

    const moodLogs = logs.filter((l) => l.mood);
    const avgMood = moodLogs.length
      ? parseFloat(
        (
          moodLogs.reduce((sum, l) => sum + l.mood, 0) / moodLogs.length
        ).toFixed(1),
      )
      : null;

    res.status(200).json({
      success: true,
      summary: {
        totalDays,
        dateRange: { start, end },
        avgSleepMinutes,
        totalWorkoutSessions,
        junkFoodCount,
        cheatMealCount,
        avgMood,
      },
      logs,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/logs/:date — delete a specific day's log
export const deleteLog = async (req, res, next) => {
  try {
    const { date } = req.params;
    const log = await DailyLog.findOneAndDelete({ userId: req.userId, date });

    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "No log found for this date" });
    }

    res.status(200).json({ success: true, message: "Log deleted" });
  } catch (err) {
    next(err);
  }
};
