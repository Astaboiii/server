import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  cancelSubscription,
  getSubscriptionForUser,
  createRazorpayCheckout,
  refreshRazorpaySubscriptionForUser,
} from "../services/memberService.js";

const router = Router();

router.use(requireAuth);

router.get("/current", async (req, res, next) => {
  try {
    const subscription = await getSubscriptionForUser(req.user.id);
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

router.post("/checkout", async (req, res, next) => {
  try {
    if (!req.body?.planId) {
      const error = new Error("planId is required.");
      error.status = 400;
      throw error;
    }

    const checkout = await createRazorpayCheckout(req.user.id, req.body.planId);
    res.status(201).json({ checkout });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    if (!req.body?.razorpay_subscription_id) {
      const error = new Error("razorpay_subscription_id is required.");
      error.status = 400;
      throw error;
    }

    const subscription = await refreshRazorpaySubscriptionForUser(
      req.user.id,
      req.body.razorpay_subscription_id
    );
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

router.post("/cancel", async (req, res, next) => {
  try {
    const subscription = await cancelSubscription(req.user.id);
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

export default router;
