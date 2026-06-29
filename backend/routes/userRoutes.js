import express from "express";
import { createUser, getUsers } from "../controllers/userController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getUsers);
router.post("/", createUser);

export default router;