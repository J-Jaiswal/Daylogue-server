import { formatSleepDuration } from "../utils/dateUtils.js";

// converts raw daily log into compact readable text for LLM
export const summarizeDailyLog = (log) => {
  if (!log) return "No log available for this day.";

  const lines = [];

  // date
  lines.push(`Date: ${log.date}`);

  // sleep
  if (log.sleep?.bedTime && log.sleep?.wakeTime) {
    const duration = formatSleepDuration(log.sleep.durationMinutes);
    const quality = log.sleep.quality ? `, quality ${log.sleep.quality}/5` : "";
    lines.push(
      `Sleep: bed at ${log.sleep.bedTime}, woke at ${log.sleep.wakeTime}, ${duration}${quality}`,
    );
  } else {
    lines.push("Sleep: not logged");
  }

  // workouts
  if (log.workouts?.length) {
    log.workouts.forEach((session) => {
      const exercises = session.exercises
        .map((e) => {
          if (e.type === "sets_reps") return `${e.name} ${e.sets}x${e.reps}`;
          if (e.type === "duration") return `${e.name} ${e.durationMinutes}min`;
          return e.name;
        })
        .join(", ");
      lines.push(`Workout (${session.timeOfDay}): ${exercises}`);
    });
  } else {
    lines.push("Workout: none logged");
  }

  // meals
  if (log.meals?.length) {
    log.meals.forEach((meal) => {
      const items = meal.items.map((i) => `${i.amount} ${i.name}`).join(", ");
      lines.push(`${capitalize(meal.category)}: ${items}`);
    });
  } else {
    lines.push("Meals: not logged");
  }

  // mood
  if (log.mood) {
    lines.push(`Mood: ${log.mood}/5`);
  }

  return lines.join("\n");
};

// converts array of daily logs into a week summary block for LLM
export const summarizeWeekLogs = (logs) => {
  if (!logs?.length) return "No logs available for this week.";
  return logs.map((log) => summarizeDailyLog(log)).join("\n\n");
};

// builds a compact stats block for LLM context
export const buildStatsBlock = (summary) => {
  if (!summary) return "No recent stats available.";

  const sleep = summary.avgSleepMinutes
    ? formatSleepDuration(summary.avgSleepMinutes)
    : "N/A";

  return [
    `Last ${summary.totalDays} days summary:`,
    `- Avg sleep: ${sleep} (quality: ${summary.avgSleepQuality ?? "N/A"}/5)`,
    `- Total workout sessions: ${summary.totalWorkoutSessions}`,
    `- Junk food entries: ${summary.junkFoodCount}`,
    `- Cheat meals: ${summary.cheatMealCount}`,
    `- Avg mood: ${summary.avgMood ?? "N/A"}/5`,
  ].join("\n");
};

const capitalize = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1).replace("_", " ");
