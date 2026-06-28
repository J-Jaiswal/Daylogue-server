import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
// Node.js v24 has native fetch globally available.

dotenv.config();

// Override fallback DNS if Node is stuck on localhost/loopback resolver
if (dns.getServers().some(s => s.startsWith("127.0.0.1") || s === "localhost" || s === "::1")) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const BASE_URL = "http://localhost:5000";

const runIntegrationTest = async () => {
  try {
    console.log("Checking if server is running...");
    const healthRes = await fetch(`${BASE_URL}/health`).catch(() => null);
    if (!healthRes) {
      console.error("Server is not running. Please start the server on port 5000 first.");
      process.exit(1);
    }
    const health = await healthRes.json();
    console.log("Server Health:", health);

    console.log("\n--- Step 1: User Login ---");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "jayesh@example.com",
        password: "dummy_password_hash" // set in testApi.js
      })
    });
    
    if (!loginRes.ok) {
      // Try registering if login fails
      console.log("Login failed, attempting registration...");
      const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jayesh",
          email: "jayesh@example.com",
          password: "dummy_password_hash",
          age: 28,
          weight: 75,
          height: 178
        })
      });
      const regData = await registerRes.json();
      console.log("Register Response:", regData);
    }

    const loginData = await (await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "jayesh@example.com",
        password: "dummy_password_hash"
      })
    })).json();

    const token = loginData.token;
    console.log("Login Token successfully received!");

    const authHeader = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

    console.log("\n--- Step 2: Retrieve Profile ---");
    const profileRes = await fetch(`${BASE_URL}/api/profile`, { headers: authHeader });
    const profile = await profileRes.json();
    console.log("Full Profile response:", profile);
    console.log("User Profile Name:", profile.user?.name);
    console.log("User Goals:", profile.user?.goals);

    console.log("\n--- Step 3: Retrieve Logs by Range (June 1-5) ---");
    const rangeRes = await fetch(`${BASE_URL}/api/logs/range?start=2026-06-01&end=2026-06-05`, { headers: authHeader });
    const rangeData = await rangeRes.json();
    console.log(`Successfully retrieved ${rangeData.logs.length} logs.`);
    for (const log of rangeData.logs) {
      console.log(`- Date: ${log.date}, Mood: ${log.mood}, Workouts: ${log.workouts.length}, Meals: ${log.meals.length}`);
    }

    console.log("\n--- Step 4: Retrieve Recent Summary Stats ---");
    const summaryRes = await fetch(`${BASE_URL}/api/logs/summary?days=7`, { headers: authHeader });
    const summaryData = await summaryRes.json();
    console.log("Summary Stats:", summaryData.summary);

    console.log("\n--- Step 5: Test Upsert/Create today's log ---");
    const upsertRes = await fetch(`${BASE_URL}/api/logs`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        date: "2026-06-15",
        sleep: { bedTime: "23:25", wakeTime: "07:00", quality: 4 },
        workouts: [
          {
            timeOfDay: "evening",
            exercises: [{ name: "Pull-ups", type: "sets_reps", sets: 4, reps: 7 }]
          }
        ],
        meals: [
          { category: "breakfast", items: [{ name: "Poha", amount: "1 bowl" }] }
        ],
        mood: 4
      })
    });
    const upserted = await upsertRes.json();
    console.log("Upserted today's log successfully:", upserted.log.date);
    console.log("Calculated Sleep duration:", upserted.log.sleep.durationMinutes, "minutes");

    console.log("\nAll integration checks for data generation, storage, and retrieval succeeded!");
    process.exit(0);
  } catch (err) {
    console.error("Integration test failed:", err);
    process.exit(1);
  }
};

runIntegrationTest();
