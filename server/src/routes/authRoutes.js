import { Router } from "express";
import { createToken } from "../lib/tokenService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  authenticateUser,
  createUser,
} from "../services/userService.js";

const router = Router();

function validateAuthBody(body) {
  const { name, email, password, charityId, contributionPercentage, donationAmount } = body;

  if (typeof email !== "string" || typeof password !== "string") {
    const error = new Error("Email and password are required.");
    error.status = 400;
    throw error;
  }

  if ("name" in body && typeof name !== "string") {
    const error = new Error("Name must be a string.");
    error.status = 400;
    throw error;
  }

  if ("charityId" in body && typeof charityId !== "string") {
    const error = new Error("Charity selection must be a valid ID.");
    error.status = 400;
    throw error;
  }

  if ("contributionPercentage" in body) {
    const percentage = Number(contributionPercentage);
    if (Number.isNaN(percentage) || percentage < 10 || percentage > 100) {
      const error = new Error("Contribution percentage must be a number between 10 and 100.");
      error.status = 400;
      throw error;
    }

    if (!charityId) {
      const error = new Error("Charity selection is required when contribution percentage is provided.");
      error.status = 400;
      throw error;
    }
  }

  if ("donationAmount" in body) {
    const donation = Number(donationAmount);
    if (Number.isNaN(donation) || donation < 0) {
      const error = new Error("Donation amount must be a positive number.");
      error.status = 400;
      throw error;
    }
  }

  if (!email.trim() || password.length < 6) {
    const error = new Error("Use a valid email and a password of at least 6 characters.");
    error.status = 400;
    throw error;
  }
}

router.post("/signup", async (req, res, next) => {
  try {
    validateAuthBody(req.body);

    if (!req.body.name?.trim()) {
      const error = new Error("Name is required.");
      error.status = 400;
      throw error;
    }

    const user = await createUser({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      charityId: req.body.charityId,
      contributionPercentage: req.body.contributionPercentage,
      donationAmount: req.body.donationAmount,
    });

    const token = createToken(user);
    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    validateAuthBody(req.body);
    const user = await authenticateUser(req.body);
    const token = createToken(user);
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({
    user: req.user,
  });
});

export default router;

