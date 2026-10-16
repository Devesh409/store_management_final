import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import "dotenv/config";

import authMiddleware from "./Middleware/authMiddleware.js";
import { route } from "./Routes/route.js";
import connectDB from "./Db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../shop_frontend/dist");

const server = express();
const PORT = process.env.PORT || 8000;

const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((item) => item.trim().replace(/\/$/, ""))
  : [];

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g. curl, postman, mobile)
    if (!origin) return callback(null, true);

    // Automatically allow all *.onrender.com domains and local development hosts
    try {
      const parsed = new URL(origin);
      if (
        parsed.hostname.endsWith(".onrender.com") ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1"
      ) {
        return callback(null, true);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    if (
      process.env.NODE_ENV !== "production" ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes("*")
    ) {
      return callback(null, true);
    }

    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

server.use(cors(corsOptions));
server.use(cookieParser());
server.use(express.json({ limit: "16kb" }));
server.use(express.urlencoded({ extended: true }));

// Health check endpoint for cloud hosting / deployment monitors
server.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
server.use("/api", route);

// Serve frontend static build if present (e.g. monolithic deploy)
if (fs.existsSync(frontendDistPath)) {
  server.use(express.static(frontendDistPath));
  server.get("*", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  server.get("/", (req, res) => {
    res.send("Shop Management API is running.");
  });

  server.get("*", (req, res) => {
    res.status(404).send("404 NOT FOUND <a href='./'> Go To Home</a>");
  });
}

// connect to db & start server:
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Error connecting::index.js", error);
  });