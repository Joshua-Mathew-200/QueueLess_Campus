require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

async function makeStaff() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Missing database configuration");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "queuelessCampus",
      authSource: "admin",
      serverSelectionTimeoutMS: 10000,
    });

    const user = await User.findOneAndUpdate(
      { email: "staff@example.com" },
      { $set: { role: "staff" } },
      { new: true, runValidators: true }
    );

    if (!user) {
      console.log("Register staff@example.com on the website first.");
      process.exitCode = 1;
      return;
    }

    console.log("Staff account is ready:", user.email);
  } catch (error) {
    console.error("Staff setup failed:", error.name);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

makeStaff();