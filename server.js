import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const services = {
  database: { connected: false, error: null },
  groq: {
    configured: Boolean(process.env.GROQ_API_KEY),
    error: process.env.GROQ_API_KEY ? null : "GROQ_API_KEY is missing",
  },
  jwt: {
    configured: Boolean(process.env.JWT_SECRET),
    error: process.env.JWT_SECRET ? null : "JWT_SECRET is missing",
  },
};

const requireDatabase = (req, res, next) => {
  if (services.database.connected && mongoose.connection.readyState === 1) {
    return next();
  }

  services.database.connected = false;
  services.database.error ||= "MongoDB connection is not ready";

  return res.status(503).json({
    success: false,
    message: "Database service is not connected",
    service: "database",
    details: services.database.error,
  });
};

const requireGroq = (req, res, next) => {
  if (services.groq.configured) return next();

  return res.status(503).json({
    success: false,
    message: "AI service is not configured",
    service: "groq",
    details: services.groq.error,
  });
};

const requireJwtSecret = (req, res, next) => {
  if (services.jwt.configured) return next();

  return res.status(500).json({
    success: false,
    message: "Authentication service is not configured",
    service: "jwt",
    details: services.jwt.error,
  });
};

const serviceErrorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode;
  const message = err.message || "";

  if (
    err.name === "MongooseServerSelectionError" ||
    err.name === "MongoNetworkError" ||
    message.includes("ECONNREFUSED") ||
    message.includes("buffering timed out")
  ) {
    services.database.connected = false;
    services.database.error = message;
    return res.status(503).json({
      success: false,
      message: "Database service is unavailable",
      service: "database",
    });
  }

  if (
    err.service === "groq" ||
    (req.originalUrl?.startsWith("/api/ai") &&
      (statusCode === 401 ||
        statusCode === 403 ||
        message.toLowerCase().includes("api key")))
  ) {
    return res.status(503).json({
      success: false,
      message: "AI service rejected the configured API key",
      service: "groq",
    });
  }

  if (message.includes("secretOrPrivateKey")) {
    return res.status(500).json({
      success: false,
      message: "Authentication service is not configured",
      service: "jwt",
    });
  }

  next(err);
};

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/health", (req, res) => {
  const healthy =
    services.database.connected &&
    services.groq.configured &&
    services.jwt.configured;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    services,
  });
});

app.use("/api/auth", requireJwtSecret, requireDatabase, authRoutes);
app.use("/api/logs", requireJwtSecret, requireDatabase, logRoutes);
app.use("/api/profile", requireJwtSecret, requireDatabase, profileRoutes);
app.use("/api/ai", requireJwtSecret, requireDatabase, requireGroq, aiRoutes);

app.use(serviceErrorHandler);
app.use(errorHandler);

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    services.database.error = "MONGO_URI is missing";
  } else {
    try {
      await connectDB();
      services.database.connected = true;
    } catch (err) {
      services.database.error = err.message;
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    if (!services.database.connected) {
      console.warn(`Database unavailable: ${services.database.error}`);
    }

    if (!services.groq.configured) {
      console.warn(`AI service unavailable: ${services.groq.error}`);
    }

    if (!services.jwt.configured) {
      console.warn(`Auth service unavailable: ${services.jwt.error}`);
    }
  });
};

startServer();
