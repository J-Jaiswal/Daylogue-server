import { getGroqClient } from "../config/groq.js";
import DailyLog from "../models/DailyLog.js";
import WeeklyReview from "../models/WeeklyReview.js";
import User from "../models/User.js";
import {
  summarizeDailyLog,
  summarizeWeekLogs,
  buildStatsBlock,
} from "./summaryService.js";
import {
  buildSystemPrompt,
  buildDailyPrompt,
  buildWeeklyReviewPrompt,
  buildChatPrompt,
} from "../utils/promptBuilder.js";
import { getTodayString, getWeekStartString } from "../utils/dateUtils.js";

// ── Daily Suggestion Cards ─────────────────────────────────────────────────

export const getDailySuggestions = async (userId) => {
  const user = await User.findById(userId).select("-password");

  const today = getTodayString();

  // check if already generated today
  const todayLog = await DailyLog.findOne({ userId, date: today });
  if (todayLog?.aiDailySuggestion) {
    return JSON.parse(todayLog.aiDailySuggestion);
  }

  // get yesterday's log
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const yesterdayLog = await DailyLog.findOne({ userId, date: yesterdayStr });

  // get last 7 days summary
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startStr = sevenDaysAgo.toISOString().split("T")[0];
  const recentLogs = await DailyLog.find({
    userId,
    date: { $gte: startStr, $lte: yesterdayStr },
  });

  const totalDays = recentLogs.length;
  const sleepLogs = recentLogs.filter((l) => l.sleep?.durationMinutes);
  const avgSleepMinutes = sleepLogs.length
    ? Math.round(
        sleepLogs.reduce((s, l) => s + l.sleep.durationMinutes, 0) /
          sleepLogs.length,
      )
    : null;
  const avgSleepQuality = sleepLogs.length
    ? parseFloat(
        (
          sleepLogs.reduce((s, l) => s + (l.sleep.quality || 0), 0) /
          sleepLogs.length
        ).toFixed(1),
      )
    : null;
  const totalWorkoutSessions = recentLogs.reduce(
    (s, l) => s + (l.workouts?.length || 0),
    0,
  );
  const allMeals = recentLogs.flatMap((l) => l.meals || []);
  const junkFoodCount = allMeals.filter(
    (m) => m.category === "junk_food",
  ).length;
  const cheatMealCount = allMeals.filter(
    (m) => m.category === "cheat_meal",
  ).length;
  const moodLogs = recentLogs.filter((l) => l.mood);
  const avgMood = moodLogs.length
    ? parseFloat(
        (moodLogs.reduce((s, l) => s + l.mood, 0) / moodLogs.length).toFixed(1),
      )
    : null;

  const statsBlock = buildStatsBlock({
    totalDays,
    avgSleepMinutes,
    avgSleepQuality,
    totalWorkoutSessions,
    junkFoodCount,
    cheatMealCount,
    avgMood,
  });

  const yesterdayText = summarizeDailyLog(yesterdayLog);
  const systemPrompt = buildSystemPrompt(user);
  const userPrompt = buildDailyPrompt(yesterdayText, statsBlock);

  const response = await getGroqClient().chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const raw = response.choices[0].message.content.trim();

  // safely parse JSON response
  let suggestions;
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    suggestions = JSON.parse(clean);
  } catch {
    suggestions = [{ category: "lifestyle", suggestion: raw }];
  }

  // store on today's log so we don't regenerate
  if (todayLog) {
    todayLog.aiDailySuggestion = JSON.stringify(suggestions);
    await todayLog.save();
  }

  return suggestions;
};

// ── Weekly Review ──────────────────────────────────────────────────────────

export const getWeeklyReview = async (userId) => {
  const user = await User.findById(userId).select("-password");
  const weekStart = getWeekStartString();

  // return cached review if already generated this week
  const existing = await WeeklyReview.findOne({
    userId,
    weekStartDate: weekStart,
  });
  if (existing) return existing;

  // get this week's logs
  const weekEnd = getTodayString();
  const thisWeekLogs = await DailyLog.find({
    userId,
    date: { $gte: weekStart, $lte: weekEnd },
  }).sort({ date: 1 });

  // get previous week's logs for comparison
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekLogs = await DailyLog.find({
    userId,
    date: {
      $gte: prevWeekStart.toISOString().split("T")[0],
      $lte: prevWeekEnd.toISOString().split("T")[0],
    },
  }).sort({ date: 1 });

  const buildWeekStats = (logs) => {
    if (!logs.length) return null;
    const sleepLogs = logs.filter((l) => l.sleep?.durationMinutes);
    const allMeals = logs.flatMap((l) => l.meals || []);
    const moodLogs = logs.filter((l) => l.mood);
    return {
      totalDays: logs.length,
      avgSleepMinutes: sleepLogs.length
        ? Math.round(
            sleepLogs.reduce((s, l) => s + l.sleep.durationMinutes, 0) /
              sleepLogs.length,
          )
        : null,
      avgSleepQuality: sleepLogs.length
        ? parseFloat(
            (
              sleepLogs.reduce((s, l) => s + (l.sleep.quality || 0), 0) /
              sleepLogs.length
            ).toFixed(1),
          )
        : null,
      totalWorkoutSessions: logs.reduce(
        (s, l) => s + (l.workouts?.length || 0),
        0,
      ),
      junkFoodCount: allMeals.filter((m) => m.category === "junk_food").length,
      cheatMealCount: allMeals.filter((m) => m.category === "cheat_meal")
        .length,
      avgMood: moodLogs.length
        ? parseFloat(
            (
              moodLogs.reduce((s, l) => s + l.mood, 0) / moodLogs.length
            ).toFixed(1),
          )
        : null,
    };
  };

  const thisWeekStats = buildWeekStats(thisWeekLogs);
  const prevWeekStats = buildWeekStats(prevWeekLogs);

  const weekSummary = summarizeWeekLogs(thisWeekLogs);
  const statsBlock = buildStatsBlock(thisWeekStats);
  const prevStatsBlock = prevWeekStats ? buildStatsBlock(prevWeekStats) : null;

  const systemPrompt = buildSystemPrompt(user);
  const userPrompt = buildWeeklyReviewPrompt(
    weekSummary,
    statsBlock,
    prevStatsBlock,
  );

  const response = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 800,
  });

  const narrative = response.choices[0].message.content.trim();

  // store the review
  const review = await WeeklyReview.create({
    userId,
    weekStartDate: weekStart,
    narrative,
    stats: thisWeekStats,
    phaseSnapshot: user.currentPhase,
  });

  return review;
};

// ── Chat ───────────────────────────────────────────────────────────────────

export const chatWithAI = async (
  userId,
  userMessage,
  conversationHistory = [],
) => {
  const user = await User.findById(userId).select("-password");

  // get last 14 days of logs for context
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const startStr = fourteenDaysAgo.toISOString().split("T")[0];
  const endStr = getTodayString();

  const recentLogs = await DailyLog.find({
    userId,
    date: { $gte: startStr, $lte: endStr },
  }).sort({ date: -1 });

  const recentLogsBlock = summarizeWeekLogs(recentLogs);

  const sleepLogs = recentLogs.filter((l) => l.sleep?.durationMinutes);
  const allMeals = recentLogs.flatMap((l) => l.meals || []);
  const moodLogs = recentLogs.filter((l) => l.mood);

  const statsBlock = buildStatsBlock({
    totalDays: recentLogs.length,
    avgSleepMinutes: sleepLogs.length
      ? Math.round(
          sleepLogs.reduce((s, l) => s + l.sleep.durationMinutes, 0) /
            sleepLogs.length,
        )
      : null,
    avgSleepQuality: sleepLogs.length
      ? parseFloat(
          (
            sleepLogs.reduce((s, l) => s + (l.sleep.quality || 0), 0) /
            sleepLogs.length
          ).toFixed(1),
        )
      : null,
    totalWorkoutSessions: recentLogs.reduce(
      (s, l) => s + (l.workouts?.length || 0),
      0,
    ),
    junkFoodCount: allMeals.filter((m) => m.category === "junk_food").length,
    cheatMealCount: allMeals.filter((m) => m.category === "cheat_meal").length,
    avgMood: moodLogs.length
      ? parseFloat(
          (moodLogs.reduce((s, l) => s + l.mood, 0) / moodLogs.length).toFixed(
            1,
          ),
        )
      : null,
  });

  const systemPrompt = buildSystemPrompt(user);
  const contextPrompt = buildChatPrompt(
    userMessage,
    recentLogsBlock,
    statsBlock,
  );

  // keep last 8 messages of conversation history to stay within token limits
  const trimmedHistory = conversationHistory.slice(-8);

  const response = await getGroqClient().chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
      { role: "user", content: contextPrompt },
    ],
    temperature: 0.7,
    max_tokens: 600,
  });

  return response.choices[0].message.content.trim();
};
