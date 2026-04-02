import { Router } from "express";
import { adminModules, dashboardModules, highlights, plans, prizeRules } from "../data/platformData.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getAllCharities, getCharityById } from "../services/charityService.js";
import {
  getAdminSummaryData,
  getDashboardSummaryForUser,
  updateCharitySelection,
} from "../services/memberService.js";

const router = Router();

router.get("/platform/overview", (_req, res) => {
  res.json({
    productName: "Drive For Good",
    summary:
      "A subscription-based golf platform that combines score tracking, monthly draws, and charitable impact.",
    plans,
    prizeRules,
    highlights,
    prizeHeadline: "Jackpot rollover for 5-number matches.",
    experienceTitle: "Scores + draws + giving",
    experienceCopy: "Built around outcome, not golf cliches.",
  });
});

router.get("/charities", async (_req, res, next) => {
  try {
    const charities = await getAllCharities();
    res.json(charities);
  } catch (error) {
    next(error);
  }
});

router.get("/charities/:charityId", async (req, res, next) => {
  try {
    const charity = await getCharityById(req.params.charityId);

    if (!charity) {
      const error = new Error("Charity not found.");
      error.status = 404;
      throw error;
    }

    res.json({ charity });
  } catch (error) {
    next(error);
  }
});

router.get("/plans", (_req, res) => {
  res.json(plans);
});

router.get("/dashboard/summary", requireAuth, async (req, res, next) => {
  try {
    const dashboardData = await getDashboardSummaryForUser(req.user.id);

    res.json({
      user: req.user,
      modules: dashboardModules,
      ...dashboardData,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/dashboard/charity", requireAuth, async (req, res, next) => {
  try {
    if (!req.body?.charityId) {
      const error = new Error("charityId is required.");
      error.status = 400;
      throw error;
    }

    const donationAmount = Number(req.body.extraDonationAmount || 0);
    const contributionPercentage = req.body.contributionPercentage;

    const selection = await updateCharitySelection(
      req.user.id,
      req.body.charityId,
      donationAmount,
      contributionPercentage
    );

    res.json({ selection });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/summary", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const adminData = await getAdminSummaryData();

    res.json({
      user: req.user,
      modules: adminModules,
      ...adminData,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
