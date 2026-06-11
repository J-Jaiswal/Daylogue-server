import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    return true;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }
};
