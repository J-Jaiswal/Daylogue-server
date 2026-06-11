import mongoose from "mongoose";

const phaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    primaryGoal: {
      type: String,
      enum: ["building", "maintaining", "fat_loss", "competition_prep"],
      required: true,
    },
    lifeContext: {
      type: String,
      enum: ["job_seeker", "working_professional", "student", "off_season"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null }, // null means currently active
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Phase", phaseSchema);
