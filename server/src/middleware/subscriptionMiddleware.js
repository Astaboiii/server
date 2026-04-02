import { hasActiveSubscription } from "../services/memberService.js";

export async function requireActiveSubscription(req, res, next) {
  const isActive = await hasActiveSubscription(req.user.id);

  if (!isActive) {
    return res.status(403).json({
      message: "An active subscription is required for score entry.",
    });
  }

  next();
}

