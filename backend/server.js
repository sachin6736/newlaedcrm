import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import dns from 'dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
 
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import userRoutes from "./routes/userRoutes.js";
 
dotenv.config();
console.log(process.env.MONGO_URI);

const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CORS_ORIGIN || "").split(",").map((origin) => origin.trim()),
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

// Connect Database
connectDB();

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);
 
// Test Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend Running ðŸš€",
  });
});

// Port
const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

