import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  listPendingProofs,
  reviewProofSubmission,
} from "../services/winnerService.js";
import { sendEmail } from "../lib/notificationService.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/pending", async (_req, res, next) => {
  try {
    const proofs = await listPendingProofs();
    res.json({ proofs });
  } catch (error) {
    next(error);
  }
});

router.post("/:submissionId/review", async (req, res, next) => {
  try {
    const proof = await reviewProofSubmission(req.params.submissionId, req.body?.decision);

    sendEmail({
      to: proof.userEmail || process.env.NOTIFICATION_EMAIL || "admin@driveforgood.example",
      subject: `Proof ${proof.status.toLowerCase()} for submission ${proof.id}`,
      body: `Your proof submission has been ${proof.status.toLowerCase()}. Current payment state: ${proof.paymentStatus}.`,
    });

    res.json({ proof });
  } catch (error) {
    next(error);
  }
});

export default router;

