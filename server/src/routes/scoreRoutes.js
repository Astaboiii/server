import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireActiveSubscription } from "../middleware/subscriptionMiddleware.js";
import {
  createScoreForUser,
  listScoresForUser,
  updateScoreForUser,
} from "../services/scoreService.js";

const router = Router();

router.use(requireAuth, requireActiveSubscription);

function validateScorePayload(body) {
  const grossScore = Number(body?.grossScore);

  if (!body?.courseName?.trim()) {
    const error = new Error("courseName is required.");
    error.status = 400;
    throw error;
  }

  if (!body?.playedAt) {
    const error = new Error("playedAt is required.");
    error.status = 400;
    throw error;
  }

  if (!Number.isFinite(grossScore) || grossScore < 1 || grossScore > 45) {
    const error = new Error("grossScore must be a Stableford score between 1 and 45.");
    error.status = 400;
    throw error;
  }
}

router.get("/", async (req, res, next) => {
  try {
    const scoreData = await listScoresForUser(req.user.id);
    res.json(scoreData);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    validateScorePayload(req.body);
    const score = await createScoreForUser(req.user.id, req.body);
    res.status(201).json({ score });
  } catch (error) {
    next(error);
  }
});

router.patch("/:scoreId", async (req, res, next) => {
  try {
    validateScorePayload(req.body);
    const score = await updateScoreForUser(req.user.id, req.params.scoreId, req.body);
    res.json({ score });
  } catch (error) {
    next(error);
  }
});

export default router;

