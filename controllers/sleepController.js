import DailyLog from "../models/DailyLog.js";
import User from "../models/User.js";

// POST /api/sleep/start
export const startSleep = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.activeSleepSession && user.activeSleepSession.fellAsleepTime) {
      return res.status(400).json({ message: "A sleep session is already active" });
    }

    const now = new Date();
    // YYYY-MM-DD in local time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const fellAsleepDate = `${year}-${month}-${day}`;

    user.activeSleepSession = {
      fellAsleepDate,
      fellAsleepTime: now,
    };

    await user.save();
    return res.status(200).json({ success: true, session: user.activeSleepSession });
  } catch (err) {
    next(err);
  }
};

// POST /api/sleep/complete
export const completeSleep = async (req, res, next) => {
  try {
    const { wokeUpTime, wokeUpDate: clientWokeUpDate } = req.body;
    if (!wokeUpTime) {
      return res.status(400).json({ message: "wokeUpTime is required" });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.activeSleepSession || !user.activeSleepSession.fellAsleepTime) {
      return res.status(400).json({ message: "No active sleep session found" });
    }

    const fellAsleepTime = new Date(user.activeSleepSession.fellAsleepTime);
    const fellAsleepDate = user.activeSleepSession.fellAsleepDate;
    const wokeUpTimeDate = new Date(wokeUpTime);

    if (wokeUpTimeDate < fellAsleepTime) {
      return res.status(400).json({ message: "Woke up time cannot be earlier than fell asleep time" });
    }

    // Prefer client-side local date if provided, otherwise fallback to UTC date part
    const wokeUpDate = clientWokeUpDate || wokeUpTime.split("T")[0];

    // Compute duration in minutes
    const duration = Math.round((wokeUpTimeDate - fellAsleepTime) / 60000);

    // Compute crossesMidnight
    const crossesMidnight = fellAsleepDate !== wokeUpDate;

    const sleepData = {
      fellAsleepDate,
      fellAsleepTime,
      wokeUpDate,
      wokeUpTime: wokeUpTimeDate,
      duration,
      crossesMidnight,
    };

    // Clear activeSleepSession on User
    user.activeSleepSession = {
      fellAsleepDate: null,
      fellAsleepTime: null,
    };
    await user.save();

    return res.status(200).json({ success: true, sleep: sleepData });
  } catch (err) {
    next(err);
  }
};

// POST /api/sleep/cancel
export const cancelSleep = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.activeSleepSession || !user.activeSleepSession.fellAsleepTime) {
      return res.status(400).json({ message: "No active sleep session found" });
    }

    user.activeSleepSession = {
      fellAsleepDate: null,
      fellAsleepTime: null,
    };
    await user.save();

    return res.status(200).json({ message: "Sleep session cancelled" });
  } catch (err) {
    next(err);
  }
};

// GET /api/sleep/active
export const getActiveSleep = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.activeSleepSession || !user.activeSleepSession.fellAsleepTime) {
      return res.status(200).json({ active: false });
    }

    const { fellAsleepDate, fellAsleepTime } = user.activeSleepSession;
    const start = new Date(fellAsleepTime);
    const elapsedMinutes = Math.round((Date.now() - start.getTime()) / 60000);

    const result = {
      active: true,
      fellAsleepDate,
      fellAsleepTime,
      elapsedMinutes,
    };

    if (elapsedMinutes > 1080) {
      result.isStale = true;
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/sleep/nap
export const addNap = async (req, res, next) => {
  try {
    const { date, startTime, endTime } = req.body;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "date, startTime, and endTime are required" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    const duration = Math.round((end - start) / 60000);
    if (duration <= 0) {
      return res.status(400).json({ message: "Nap duration must be greater than 0 minutes" });
    }

    // Validate times are within the same calendar day (no cross-midnight naps)
    if (start.getFullYear() !== end.getFullYear() ||
        start.getMonth() !== end.getMonth() ||
        start.getDate() !== end.getDate()) {
      return res.status(400).json({ message: "Nap times must be within the same calendar day (no cross-midnight naps)" });
    }

    // Derive timeOfDay from startTime hour
    const hour = start.getHours();
    let timeOfDay = "evening";
    if (hour < 12) {
      timeOfDay = "morning";
    } else if (hour <= 17) {
      timeOfDay = "afternoon";
    }

    const user = await User.findById(req.userId);
    const phaseSnapshot = user?.currentPhase;

    let log = await DailyLog.findOne({ userId: req.userId, date });
    const newNap = {
      startTime: start,
      endTime: end,
      duration,
      timeOfDay,
    };

    if (log) {
      log.naps.push(newNap);
      await log.save();
    } else {
      log = await DailyLog.create({
        userId: req.userId,
        date,
        sleep: null,
        workouts: [],
        meals: [],
        naps: [newNap],
        phaseSnapshot,
      });
    }

    const savedNap = log.naps[log.naps.length - 1];
    return res.status(201).json(savedNap);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sleep/nap/:napId
export const deleteNap = async (req, res, next) => {
  try {
    const { napId } = req.params;

    const log = await DailyLog.findOne({
      userId: req.userId,
      "naps._id": napId,
    });

    if (!log) {
      return res.status(404).json({ message: "Nap not found" });
    }

    log.naps = log.naps.filter((n) => n._id.toString() !== napId);
    await log.save();

    return res.status(200).json({ message: "Nap deleted" });
  } catch (err) {
    next(err);
  }
};
