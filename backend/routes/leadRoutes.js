import express from "express";
import {
  createLead,
  dismissFollowUp,
  getDueFollowUps,
  getLeads,
  updateLead,
} from "../controllers/leadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createLead);

router.use(protect);
router.get("/followups/due", getDueFollowUps);
router.get("/", getLeads);
router.patch("/:id", updateLead);
router.patch("/:id/followup/dismiss", dismissFollowUp);

export default router;
