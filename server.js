import "./env.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "dns";
import { connectDB } from "./config/db.js";

// Override fallback DNS if Node is stuck on localhost/loopback resolver
if (dns.getServers().some(s => s.startsWith("127.0.0.1") || s === "localhost" || s === "::1")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

import authRoutes from "./routes/authRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import sleepRoutes from "./routes/sleepRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";



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

const isValidMongoUri = (uri) =>
  uri?.startsWith("mongodb://") || uri?.startsWith("mongodb+srv://");

const hasPlaceholderToken = (value) => /<[^>]+>/.test(value || "");

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
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Daylogue API Server is running",
    healthCheck: "/health"
  });
});

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
app.use("/api/sleep", requireJwtSecret, requireDatabase, sleepRoutes);
app.use("/api/ai", requireJwtSecret, requireDatabase, requireGroq, aiRoutes);

app.use(serviceErrorHandler);
app.use(errorHandler);

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    services.database.error = "MONGO_URI is missing";
  } else if (!isValidMongoUri(process.env.MONGO_URI)) {
    services.database.error =
      'MONGO_URI must start with "mongodb://" or "mongodb+srv://"';
  } else if (hasPlaceholderToken(process.env.MONGO_URI)) {
    services.database.error =
      "MONGO_URI still contains placeholder values like <username>, <password>, or <cluster-url>";
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
