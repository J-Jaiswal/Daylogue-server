import User from "../models/User.js";
import Phase from "../models/Phase.js";
import { getTodayString } from "../utils/dateUtils.js";

// GET /api/profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/profile/update — update basic profile info
export const updateProfile = async (req, res, next) => {
  try {
    const { name, age, weight, height, goals, gender, activeSleepSession } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (age !== undefined) updateFields.age = age;
    if (weight !== undefined) updateFields.weight = weight;
    if (height !== undefined) updateFields.height = height;
    if (goals !== undefined) updateFields.goals = goals;
    if (gender !== undefined) updateFields.gender = gender;
    if (activeSleepSession !== undefined) updateFields.activeSleepSession = activeSleepSession;

    const updated = await User.findByIdAndUpdate(
      req.userId,
      updateFields,
      { new: true, runValidators: true },
    ).select("-password");

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
};

// PUT /api/profile/phase — update phase of life
// closes current active phase, opens a new one, updates user.currentPhase
export const updatePhase = async (req, res, next) => {
  try {
    const { primaryGoal, lifeContext, notes } = req.body;

    if (!primaryGoal || !lifeContext) {
      return res.status(400).json({
        success: false,
        message: "primaryGoal and lifeContext are required",
      });
    }

    const today = getTodayString();

    // close the currently active phase if one exists
    await Phase.findOneAndUpdate(
      { userId: req.userId, endDate: null },
      { endDate: today },
    );

    // create new active phase
    const newPhase = await Phase.create({
      userId: req.userId,
      primaryGoal,
      lifeContext,
      startDate: today,
      endDate: null,
      notes: notes || "",
    });

    // update user's currentPhase snapshot
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { currentPhase: { primaryGoal, lifeContext } },
      { new: true, runValidators: true },
    ).select("-password");

    res.status(200).json({
      success: true,
      currentPhase: updatedUser.currentPhase,
      phaseRecord: newPhase,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/profile/phases — full phase history
export const getPhaseHistory = async (req, res, next) => {
  try {
    const phases = await Phase.find({ userId: req.userId }).sort({
      startDate: -1,
    });
    res.status(200).json({ success: true, phases });
  } catch (err) {
    next(err);
  }
};
