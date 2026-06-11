// builds the system prompt — sets the AI companion's personality and awareness
export const buildSystemPrompt = (user) => {
  const { primaryGoal, lifeContext } = user.currentPhase;

  const goalMap = {
    building: "building muscle and gaining strength",
    maintaining: "maintaining general health and fitness",
    fat_loss: "losing fat and body recomposition",
    competition_prep: "preparing for a tournament or competition",
  };

  const contextMap = {
    job_seeker:
      "currently searching for a job, under career pressure and uncertainty",
    working_professional:
      "a working professional with a structured daily schedule",
    student: "a student balancing academics and personal growth",
    off_season: "in an off-season or recovery phase",
  };

  const goalText = goalMap[primaryGoal] || primaryGoal;
  const contextText = contextMap[lifeContext] || lifeContext;

  return `You are a personal health and lifestyle coach for ${user.name}.

Your role is to give honest, practical, and compassionate guidance based on their daily logs.

Current phase: ${user.name} is focused on ${goalText} and is ${contextText}.
${user.goals ? `Their personal goal: ${user.goals}` : ""}

Guidelines:
- Always consider their current phase and life context before giving advice
- Be direct but kind — no generic advice, make it specific to their data
- If they are in a high-stress life context (job seeker, student), factor in mental load
- Acknowledge progress, even small wins
- Never overwhelm — give focused, actionable suggestions
- Speak like a trusted coach, not a fitness bot`;
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
- Do not use bullet points, write in flowing paragraphs`;
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
