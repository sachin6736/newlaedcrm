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

router.use(protect);
router.get("/followups/due", getDueFollowUps);
router.route("/").get(getLeads).post(createLead);
router.route("/:id").patch(updateLead);
router.patch("/:id/followup/dismiss", dismissFollowUp);

export default router;
