import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    age: Number,
    weight: Number, // in kg
    height: Number, // in cm
    currentPhase: {
      primaryGoal: {
        type: String,
        enum: ["building", "maintaining", "fat_loss", "competition_prep"],
        default: "maintaining",
      },
      lifeContext: {
        type: String,
        enum: ["job_seeker", "working_professional", "student", "off_season"],
        default: "working_professional",
      },
    },
    goals: { type: String, default: "" }, // freeform, e.g. "gain 5kg by December"
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
