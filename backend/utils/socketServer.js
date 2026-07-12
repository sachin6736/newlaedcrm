import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { setSocketServer } from "./leadEvents.js";

export const createSocketServer = (httpServer, allowedOrigins) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Not authorized"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id role");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);

    if (socket.user.role === "admin") {
      socket.join("admins");
    }
  });

  setSocketServer(io);
  return io;
};
