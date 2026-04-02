import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getAdminDrawSummary, runMonthlyDraw } from "../services/drawService.js";
import { sendEmail } from "../lib/notificationService.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", async (_req, res, next) => {
  try {
    const summary = await getAdminDrawSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

router.post("/run", async (req, res, next) => {
  try {
    const drawResponse = await runMonthlyDraw({
      winningNumbers: req.body?.winningNumbers,
      periodKey: req.body?.periodKey,
      mode: req.body?.mode || "random",
      simulate: Boolean(req.body?.simulate),
    });

    if (drawResponse?.simulated) {
      return res.json(drawResponse);
    }

    if (drawResponse && drawResponse.periodKey) {
      sendEmail({
        to: process.env.NOTIFICATION_EMAIL || "admin@driveforgood.example",
        subject: `Official draw ${drawResponse.periodKey} published`,
        body: `The monthly draw for ${drawResponse.periodKey} has been published with mode ${drawResponse.drawMode}.`,
      });
    }

    return res.status(201).json(drawResponse);
  } catch (error) {
    next(error);
  }
});

export default router;

