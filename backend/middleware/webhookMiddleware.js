export const verifyWebhookSecret = (req, res, next) => {
  const secret = process.env.LEAD_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(503).json({
      success: false,
      message: "Webhook ingestion is not configured.",
    });
  }

  const providedSecret = req.headers["x-webhook-secret"];

  if (!providedSecret || providedSecret !== secret) {
    return res.status(401).json({
      success: false,
      message: "Invalid webhook secret.",
    });
  }

  next();
};