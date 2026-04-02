import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getWinningsSummaryForUser,
  submitProofForUser,
} from "../services/winnerService.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", async (req, res, next) => {
  try {
    const summary = await getWinningsSummaryForUser(req.user.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

router.post("/proof", async (req, res, next) => {
  try {
    const proof = await submitProofForUser(req.user.id, req.body);
    res.status(201).json({ proof });
  } catch (error) {
    next(error);
  }
});

export default router;

