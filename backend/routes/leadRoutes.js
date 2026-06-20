import express from "express";
import { createLead, getLeads, updateLead } from "../controllers/leadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(getLeads).post(createLead);
router.route("/:id").patch(updateLead);

export default router;
