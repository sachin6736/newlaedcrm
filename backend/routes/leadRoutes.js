import express from "express";
import { createLead, getLeads } from "../controllers/leadController.js";

const router = express.Router();

router.route("/").get(getLeads).post(createLead);

export default router;
