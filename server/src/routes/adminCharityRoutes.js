import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  createCharity,
  deleteCharity,
  getAllCharities,
  getCharityById,
  updateCharity,
} from "../services/charityService.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

function validateCharityPayload(body) {
  const { id, name, mission, contributionPercentage } = body;

  if (typeof id !== "string" || !id.trim()) {
    const error = new Error("Charity id is required.");
    error.status = 400;
    throw error;
  }

  if (typeof name !== "string" || !name.trim()) {
    const error = new Error("Charity name is required.");
    error.status = 400;
    throw error;
  }

  if (typeof mission !== "string" || !mission.trim()) {
    const error = new Error("Charity mission is required.");
    error.status = 400;
    throw error;
  }

  const percentage = Number(contributionPercentage);
  if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
    const error = new Error("Contribution percentage must be between 1 and 100.");
    error.status = 400;
    throw error;
  }
}

router.get("/", async (_req, res, next) => {
  try {
    const charities = await getAllCharities();
    res.json({ charities });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    validateCharityPayload(req.body);
    const charity = await createCharity({
      id: req.body.id.trim(),
      name: req.body.name.trim(),
      mission: req.body.mission.trim(),
      contributionPercentage: Number(req.body.contributionPercentage),
    });
    res.status(201).json({ charity });
  } catch (error) {
    next(error);
  }
});

router.patch("/:charityId", async (req, res, next) => {
  try {
    const charity = await getCharityById(req.params.charityId);

    if (!charity) {
      const error = new Error("Charity not found.");
      error.status = 404;
      throw error;
    }

    validateCharityPayload({
      id: req.params.charityId,
      name: req.body.name,
      mission: req.body.mission,
      contributionPercentage: req.body.contributionPercentage,
    });

    const updated = await updateCharity(req.params.charityId, {
      name: req.body.name.trim(),
      mission: req.body.mission.trim(),
      contributionPercentage: Number(req.body.contributionPercentage),
    });

    res.json({ charity: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:charityId", async (req, res, next) => {
  try {
    const charity = await getCharityById(req.params.charityId);

    if (!charity) {
      const error = new Error("Charity not found.");
      error.status = 404;
      throw error;
    }

    await deleteCharity(req.params.charityId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
