import mongoose from "mongoose";

let cachedConnection = null;

export const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (mongoose.connection.readyState === 2) {
    return mongoose.connection;
  }

  try {
    cachedConnection = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    return cachedConnection;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }
};
