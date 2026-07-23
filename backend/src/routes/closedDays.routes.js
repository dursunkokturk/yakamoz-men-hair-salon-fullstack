import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { conflictError, notFoundError, validationError } from "../utils/AppError.js";
import { isValidDateISO } from "../utils/dateUtils.js";

const router = Router();

// GET /api/closed-days — herkese açık (Calendar bileşeni kapalı günleri göstermek için kullanır)
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const closedDays = await prisma.closedDay.findMany({ orderBy: { date: "asc" } });
    res.json({ closedDays });
  })
);

// POST /api/closed-days  { date, reason } — yalnızca admin
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { date, reason = "" } = req.body ?? {};
    if (!isValidDateISO(date)) throw validationError("Geçerli bir tarih (YYYY-MM-DD) giriniz");

    const existing = await prisma.closedDay.findUnique({ where: { date } });
    if (existing) throw conflictError("Bu tarih zaten kapalı olarak işaretli", { code: "ALREADY_CLOSED" });

    const closedDay = await prisma.closedDay.create({ data: { date, reason: String(reason).trim() } });
    res.status(201).json({ closedDay });
  })
);

// DELETE /api/closed-days/:id — yalnızca admin
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const closedDay = await prisma.closedDay.findUnique({ where: { id: req.params.id } });
    if (!closedDay) throw notFoundError("Kapalı gün kaydı bulunamadı");

    await prisma.closedDay.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);

export default router;
