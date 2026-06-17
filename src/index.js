const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const { initDB } = require("./db/database");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const tokenRoutes = require("./routes/token");

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later" },
}));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/token", tokenRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await initDB();
    console.log("Database initialized.");

    app.listen(config.port, () => {
      console.log(`OAuth2 Auth Service running on port ${config.port}`);
      console.log(`Health check: http://localhost:${config.port}/api/health`);
      console.log(`Supported providers: github, google, wechat`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
