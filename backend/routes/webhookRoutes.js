import express from "express";
import { createExternalLead } from "../controllers/webhookController.js";
import { verifyWebhookSecret } from "../middleware/webhookMiddleware.js";

const router = express.Router();

router.post("/leads", verifyWebhookSecret, createExternalLead);

export default router;