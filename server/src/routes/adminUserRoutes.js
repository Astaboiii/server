import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getUserById, updateUserById } from "../services/userService.js";
import { listScoresForUser, updateScoreForUser } from "../services/scoreService.js";
import { getDashboardSummaryForUser } from "../services/memberService.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/users/:userId", async (req, res, next) => {
  try {
    const user = await getUserById(req.params.userId);

    if (!user) {
      const error = new Error("User not found.");
      error.status = 404;
      throw error;
    }

    const summary = await getDashboardSummaryForUser(req.params.userId);
    const scores = await listScoresForUser(req.params.userId);

    res.json({ user, summary, scores: scores.scores || [] });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:userId", async (req, res, next) => {
  try {
    const updates = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    };

    const user = await updateUserById(req.params.userId, updates);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get("/users/:userId/scores", async (req, res, next) => {
  try {
    const scores = await listScoresForUser(req.params.userId);
    res.json({ scores: scores.scores || [] });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:userId/scores/:scoreId", async (req, res, next) => {
  try {
    const score = await updateScoreForUser(req.params.userId, req.params.scoreId, req.body);
    res.json({ score });
  } catch (error) {
    next(error);
  }
});

export default router;
