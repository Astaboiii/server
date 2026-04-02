import Razorpay from "razorpay";

let razorpayClient = null;

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpay() {
  if (!isRazorpayConfigured()) {
    const error = new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and the plan IDs in server/.env before using payment-backed subscription routes."
    );
    error.status = 500;
    throw error;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayClient;
}

export function getRazorpayPlanId(planId) {
  if (planId === "monthly") {
    return process.env.RAZORPAY_PLAN_MONTHLY || "";
  }

  if (planId === "yearly") {
    return process.env.RAZORPAY_PLAN_YEARLY || "";
  }

  return "";
}
