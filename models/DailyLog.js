import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Bicep Curl"
    type: { type: String, enum: ["sets_reps", "duration"], required: true },
    sets: Number,
    reps: Number,
    durationMinutes: Number,
  },
  { _id: false },
);

const workoutSessionSchema = new mongoose.Schema(
  {
    timeOfDay: {
      type: String,
      enum: ["morning", "afternoon", "evening", "late_night"],
      required: true,
    },
    exercises: [exerciseSchema],
  },
  { _id: false },
);

const mealItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Chicken"
    amount: { type: String, required: true }, // "300g" or "2 pieces"
  },
  { _id: false },
);

const mealSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        "breakfast",
        "lunch",
        "dinner",
        "snacks",
        "junk_food",
        "cheat_meal",
      ],
      required: true,
    },
    items: [mealItemSchema],
  },
  { _id: false },
);

const dailyLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: String, required: true }, // stored as "YYYY-MM-DD"

    sleep: {
      bedTime: String, // "23:30"
      wakeTime: String, // "06:30"
      durationMinutes: Number,
      quality: { type: Number, min: 1, max: 5 },
    },

    workouts: [workoutSessionSchema],
    meals: [mealSchema],

    mood: { type: Number, min: 1, max: 5 },

    aiDailySuggestion: { type: String, default: null }, // stored after first generation

    phaseSnapshot: {
      // snapshot of phase at time of log, important for historical review
      primaryGoal: String,
      lifeContext: String,
    },
  },
  { timestamps: true },
);

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyLog", dailyLogSchema);
