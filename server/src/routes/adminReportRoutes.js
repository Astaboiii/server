import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getAdminReportData } from "../services/reportService.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/reports", async (_req, res, next) => {
  try {
    const reportData = await getAdminReportData();
    res.json(reportData);
  } catch (error) {
    next(error);
  }
});

export default router;
