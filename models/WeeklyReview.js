import mongoose from "mongoose";

const weeklyReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weekStartDate: { type: String, required: true }, // "YYYY-MM-DD" Monday of that week

    narrative: { type: String, required: true }, // LLM generated letter

    stats: {
      avgSleepMinutes: Number,
      avgSleepQuality: Number,
      totalWorkoutSessions: Number,
      junkFoodCount: Number,
      cheatMealCount: Number,
      moodAvg: Number,
    },

    phaseSnapshot: {
      primaryGoal: String,
      lifeContext: String,
    },
  },
  { timestamps: true },
);

weeklyReviewSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });

export default mongoose.model("WeeklyReview", weeklyReviewSchema);
