// builds the system prompt — sets the AI companion's personality and instructions
export const buildBaseSystemPrompt = () => {
  return `You are a personal health and lifestyle coach.
Your role is to give honest, practical, and compassionate guidance based on the user's profile and their daily health logs.

Strict Response Constraints:
- Keep replies extremely concise: maximum 2 to 3 sentences.
- Do NOT use bullet points, list items, or numbered lists under any circumstances.
- Do NOT use markdown headers (such as #, ##, etc.).
- Speak like a real human expert health coach sending a WhatsApp or text message (direct, warm, expert, concise).
- Avoid conversational filler (like "Certainly! I'd be happy to help", or "In conclusion") and robotic transition phrases. Write only flowing, natural sentences.

Guidelines:
- Always consider their current phase, goals, and life context before giving advice.
- Be direct but kind — no generic advice, make it specific to their data.
- If they are in a high-stress life context (job seeker, student), factor in their mental load.
- Acknowledge progress, even small wins.
- Never overwhelm — give focused, actionable suggestions.
- Speak like a trusted coach, not a fitness bot.`;
};

// builds the structured user profile context
export const buildUserProfileBlock = (user) => {
  const { primaryGoal, lifeContext } = user.currentPhase || {};

  const goalMap = {
    building: "building muscle and gaining strength",
    maintaining: "maintaining general health and fitness",
    fat_loss: "losing fat and body recomposition",
    competition_prep: "preparing for a tournament or competition",
  };

  const contextMap = {
    job_seeker: "currently searching for a job, under career pressure and uncertainty",
    working_professional: "a working professional with a structured daily schedule",
    student: "a student balancing academics and personal growth",
    off_season: "in an off-season or recovery phase",
    new_parent: "a new parent balancing childcare and personal health",
    traveling: "currently traveling, with limited routine and gym access",
  };

  const goalText = goalMap[primaryGoal] || primaryGoal || "general health";
  const contextText = contextMap[lifeContext] || lifeContext || "unknown context";

  const genderMap = {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer not to say"
  };
  const genderText = genderMap[user.gender] || "Prefer not to say";

  return `User Profile Context:
- Name: ${user.name}
- Age: ${user.age ? user.age + " years old" : "Not specified"}
- Gender: ${genderText}
- Weight: ${user.weight ? user.weight + " kg" : "Not specified"}
- Height: ${user.height ? user.height + " cm" : "Not specified"}
- Target Goal: Focused on ${goalText}
- Life Phase/Context: ${contextText}
${user.goals ? `- Personal Target Statement: "${user.goals}"` : ""}`;
};

// serializes the last 14 days of logs into structured text chronological day-by-day
export const build14DayLogsBlock = (logs) => {
  if (!logs || logs.length === 0) return "No activity logged in the last 14 days.";

  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");

  const formatSleepDuration = (minutes) => {
    if (!minutes) return "0h";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatTime = (timeStr) => {
    const d = new Date(timeStr);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  return logs
    .map((log, index) => {
      const parts = [`Day ${index + 1} (${log.date}):`];

      // Rest / Sleep & Naps
      const hasSleep = log.sleep && log.sleep.fellAsleepTime && log.sleep.wokeUpTime;
      const hasNaps = log.naps && log.naps.length > 0;

      if (hasSleep || hasNaps) {
        const restLines = [];
        if (hasSleep) {
          restLines.push(
            `Night Sleep: slept at ${formatTime(log.sleep.fellAsleepTime)}, woke at ${formatTime(log.sleep.wokeUpTime)} (duration: ${formatSleepDuration(log.sleep.duration)})`
          );
        }
        if (hasNaps) {
          log.naps.forEach((n) => {
            const timeOfDay = n.timeOfDay ? ` (${capitalize(n.timeOfDay)})` : "";
            restLines.push(
              `Nap${timeOfDay}: ${formatTime(n.startTime)} – ${formatTime(n.endTime)} (duration: ${formatSleepDuration(n.duration)})`
            );
          });
        }
        parts.push(`- Rest:\n  ` + restLines.join("\n  "));
      } else {
        parts.push(`- Rest: not logged`);
      }

      // Workouts
      if (log.workouts && log.workouts.length > 0) {
        const workoutsLines = log.workouts.map((session) => {
          const exercises = session.exercises
            .map((e) => {
              if (e.type === "sets_reps") return `${e.name} (${e.sets}x${e.reps})`;
              if (e.type === "duration") return `${e.name} (${e.durationMinutes}min)`;
              return e.name;
            })
            .join(", ");
          return `${capitalize(session.timeOfDay)} Workout: ${exercises}`;
        });
        parts.push(`- Workouts:\n  ` + workoutsLines.join("\n  "));
      } else {
        parts.push(`- Workouts: none logged`);
      }

      // Nutrition
      if (log.meals && log.meals.length > 0) {
        const mealsLines = log.meals.map((meal) => {
          const items = meal.items.map((i) => `${i.amount} ${i.name}`).join(", ");
          return `${capitalize(meal.category)}: ${items}`;
        });
        parts.push(`- Nutrition:\n  ` + mealsLines.join("\n  "));
      } else {
        parts.push(`- Nutrition: not logged`);
      }

      // Mood
      if (log.mood) {
        parts.push(`- Mood: ${log.mood}/5`);
      }

      return parts.join("\n");
    })
    .join("\n\n");
};

// legacy exporter to avoid breaking existing imports in weekly reviews or daily sugerence
export const buildSystemPrompt = (user) => {
  const base = buildBaseSystemPrompt();
  const profile = buildUserProfileBlock(user);
  return `${base}\n\n${profile}`;
};

// builds prompt for daily suggestion cards
export const buildDailyPrompt = (yesterdayLog, statsBlock) => {
  return `Here is the user's log from yesterday:

${yesterdayLog}

${statsBlock}

Based on this, give exactly 3 short and specific suggestions for today.
Focus on what matters most given their phase and recent pattern.
Format your response as a JSON array like this:
[
  { "category": "sleep" | "workout" | "diet" | "lifestyle", "suggestion": "..." },
  { "category": "...", "suggestion": "..." },
  { "category": "...", "suggestion": "..." }
]
Only return the JSON array, nothing else.`;
};

// builds prompt for weekly review narrative
export const buildWeeklyReviewPrompt = (
  weekSummary,
  statsBlock,
  previousStatsBlock,
) => {
  return `Here are the user's logs from this past week:

${weekSummary}

${statsBlock}

${previousStatsBlock ? `For comparison, here were their stats the week before:\n${previousStatsBlock}` : ""}

Write a personal weekly review in the style of a thoughtful coach writing a letter to their athlete.
- Narrate what happened this week across sleep, workouts, and diet
- Compare to the previous week if data is available
- Acknowledge what went well
- Identify the one or two things that need focus next week
- Keep it warm, honest, and specific — not generic
- Length: 150 to 200 words
- Do not use flowing list items, write in paragraphs`;
};

// builds prompt for chat mode
export const buildChatPrompt = (userMessage, recentLogsBlock, statsBlock) => {
  return `Here is context about the user's recent activity:

${recentLogsBlock}

${statsBlock}

The user asks: "${userMessage}"

Answer directly and specifically based on their actual data.
If the data doesn't support a clear answer, say so honestly and give general guidance.
Keep the response concise — 3 to 5 sentences unless more detail is genuinely needed.`;
};
