import crypto from "crypto";
import { Router } from "express";
import { syncSubscriptionFromRazorpay } from "../services/memberService.js";

const router = Router();

function verifyWebhookSignature(rawBody, signature, secret) {
  const generated = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return generated === signature;
}

router.post("/", async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      const error = new Error("Missing Razorpay signature header.");
      error.status = 400;
      throw error;
    }

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      const error = new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
      error.status = 500;
      throw error;
    }

    if (!verifyWebhookSignature(req.body, signature, process.env.RAZORPAY_WEBHOOK_SECRET)) {
      const error = new Error("Invalid Razorpay webhook signature.");
      error.status = 400;
      throw error;
    }

    const event = JSON.parse(req.body.toString("utf8"));

    if (String(event.event || "").startsWith("subscription.")) {
      const subscription = event.payload?.subscription?.entity;

      if (subscription) {
        await syncSubscriptionFromRazorpay(subscription);
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

export default router;
