require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./models/User");
const Counter = require("./models/Counter");
const Token = require("./models/Token");
const session = require("express-session");

const mongoStoreModule = require("connect-mongo");
const MongoStore = mongoStoreModule.default || mongoStoreModule;

const app = express();
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(express.json());

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    message: "QueueLess Campus backend is running",
    database: connected ? "Connected" : "Disconnected",
  });
});

async function startServer() {
  if (!process.env.MONGODB_URI || !process.env.SESSION_SECRET) {
    console.error("Add MONGODB_URI and SESSION_SECRET to server/.env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "queuelessCampus",
      authSource: "admin",
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected to queuelessCampus");
    await Promise.all([
  User.init(),
  Counter.init(),
  Token.init(),
]);

const dateParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());

const getPart = (type) =>
  dateParts.find((part) => part.type === type).value;

const serviceDate =
  `${getPart("year")}-${getPart("month")}-${getPart("day")}`;

await Counter.updateOne(
  { _id: "main" },
  {
    $setOnInsert: {
      name: "Campus Print Shop",
      isOpen: false,
      serviceDate,
      lastTokenNumber: 0,
    },
  },
  { upsert: true }
);

console.log("Queue models and counter are ready");

    const store = MongoStore.create({
      client: mongoose.connection.getClient(),
      dbName: "queuelessCampus",
      collectionName: "sessions",
    });

    store.on("error", () => {
      console.error("Session storage error");
    });

    app.use(
      session({
        name: "queueless.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store,
        cookie: {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 8 * 60 * 60 * 1000,
        },
      })
    );

    app.use("/api/auth", require("./routes/authRoutes"));
    app.use("/api/queue", require("./routes/queueRoutes"));
    // Return JSON for unknown API routes.
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

// Serve the built React website.
const clientDist = path.join(__dirname, "../client/dist");

app.use(express.static(clientDist));

app.get("/", (req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (error) => {
    if (error) next(error);
  });
});

    app.use((err, req, res, next) => {
      console.error("Request failed:", err.name);

      res.status(err.status === 400 ? 400 : 500).json({
        message:
          err.status === 400
            ? "Invalid request."
            : "Something went wrong. Please try again.",
      });
    });

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed");
    console.error("Error type:", error.name);
    console.error("Error code:", error.code || "Not available");
    process.exit(1);
  }
}

startServer();