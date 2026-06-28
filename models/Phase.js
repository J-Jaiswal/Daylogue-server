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
      enum: ["job_seeker", "working_professional", "student", "off_season", "new_parent", "traveling"],
      required: true,
    },
    startDate: { type: String, required: true },
    endDate: { type: String, default: null }, // null means currently active
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Phase", phaseSchema);
