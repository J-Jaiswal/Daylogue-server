import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import DailyLog from "../models/DailyLog.js";
import WeeklyReview from "../models/WeeklyReview.js";
import dns from "dns";

dotenv.config();

// Apply the DNS override so we can connect on this network
if (dns.getServers().some(s => s.startsWith("127.0.0.1") || s === "localhost" || s === "::1")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const DUMMY_USER_ID = "000000000000000000000001";

const runTest = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully!");

    // 1. Clean up old test data
    console.log("Cleaning up old test data...");
    await User.deleteOne({ _id: DUMMY_USER_ID });
    await DailyLog.deleteMany({ userId: DUMMY_USER_ID });
    await WeeklyReview.deleteMany({ userId: DUMMY_USER_ID });

    // 2. Create the dummy user
    console.log("Creating dummy user...");
    const user = await User.create({
      _id: DUMMY_USER_ID,
      name: "Jayesh",
      email: "jayesh@example.com",
      password: await bcrypt.hash("dummy_password_hash", 10),
      age: 28,
      weight: 75,
      height: 178,
      currentPhase: {
        primaryGoal: "maintaining",
        lifeContext: "working_professional"
      },
      goals: "Maintain health and energy levels"
    });
    console.log(`User created: ${user.name} (${user._id})`);

    // 3. Load and validate dummy logs JSON
    const logsPath = path.resolve("seed", "dummy_logs_june2026.json");
    console.log(`Loading dummy logs from: ${logsPath}`);
    const rawData = fs.readFileSync(logsPath, "utf-8");
    const dummyLogs = JSON.parse(rawData);
    console.log(`Loaded ${dummyLogs.length} logs from JSON file.`);

    // 4. Seed logs into MongoDB
    console.log("Seeding daily logs into database...");
    const createdLogs = await DailyLog.insertMany(dummyLogs);
    console.log(`Successfully seeded ${createdLogs.length} daily logs!`);

    // 5. Test retrieve operations (simulating GET routes)
    console.log("\n--- Testing Retrieval & Query Formats ---");
    
    // Test direct retrieve
    const sampleLog = await DailyLog.findOne({ userId: DUMMY_USER_ID, date: "2026-06-01" });
    console.log("June 1st Log sleep bedTime:", sampleLog.sleep.bedTime);
    console.log("June 1st Log sleep wakeTime:", sampleLog.sleep.wakeTime);
    console.log("June 1st Log workouts count:", sampleLog.workouts.length);
    console.log("June 1st Log meals count:", sampleLog.meals.length);
    console.log("June 1st Log mood:", sampleLog.mood);
    console.log("June 1st Log AI daily suggestion exists:", !!sampleLog.aiDailySuggestion);

    // Test range query (simulating GET /api/logs/range)
    const start = "2026-06-01";
    const end = "2026-06-07";
    const rangeLogs = await DailyLog.find({
      userId: DUMMY_USER_ID,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });
    console.log(`Range query [${start} to ${end}] returned ${rangeLogs.length} logs.`);

    // Test aggregate summary calculation (simulating GET /api/logs/summary)
    console.log("\n--- Testing Summary Aggregates (Simulating GET /api/logs/summary) ---");
    const sleepLogs = createdLogs.filter((l) => l.sleep?.durationMinutes);
    const avgSleepMinutes = Math.round(
      sleepLogs.reduce((sum, l) => sum + l.sleep.durationMinutes, 0) / sleepLogs.length
    );
    const avgSleepQuality = parseFloat(
      (sleepLogs.reduce((sum, l) => sum + (l.sleep.quality || 0), 0) / sleepLogs.length).toFixed(1)
    );
    const totalWorkouts = createdLogs.reduce((sum, l) => sum + (l.workouts?.length || 0), 0);
    
    console.log(`Average Sleep duration across June: ${avgSleepMinutes} minutes (${(avgSleepMinutes / 60).toFixed(1)} hrs)`);
    console.log(`Average Sleep quality across June: ${avgSleepQuality}/5`);
    console.log(`Total Workouts in June: ${totalWorkouts}`);

    console.log("\nAll schema checks, storage, insertion, and retrieval queries succeeded!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
};

runTest();
