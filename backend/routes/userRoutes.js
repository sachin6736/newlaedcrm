import express from "express";
import {
  createUser,
  getUsers,
  updateLeadAssignmentStatus,
} from "../controllers/userController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getUsers);
router.post("/", createUser);
router.patch("/:id/lead-assignment", updateLeadAssignmentStatus);

export default router;
