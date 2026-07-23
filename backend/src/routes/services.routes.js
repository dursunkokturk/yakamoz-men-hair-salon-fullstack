import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { notFoundError, validationError } from "../utils/AppError.js";
import { isNonEmptyString } from "../utils/validation.js";

const router = Router();

// GET /api/services?active=true — herkese açık
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const activeOnly = req.query.active === "true";
    const services = await prisma.service.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: "asc" },
    });
    res.json({ services });
  })
);

function validateServicePayload(body, { partial = false } = {}) {
  const data = {};

  if (!partial || body.name !== undefined) {
    if (!isNonEmptyString(body.name)) throw validationError("Hizmet adı zorunludur");
    data.name = body.name.trim();
  }
  if (!partial || body.durationMinutes !== undefined) {
    const n = Number(body.durationMinutes);
    if (!Number.isFinite(n) || n < 5) throw validationError("Süre en az 5 dakika olmalı");
    data.durationMinutes = Math.round(n);
  }
  if (!partial || body.price !== undefined) {
    const n = Number(body.price);
    if (!Number.isFinite(n) || n < 0) throw validationError("Ücret negatif olamaz");
    data.price = Math.round(n);
  }
  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }
  return data;
}

// POST /api/services — yalnızca admin
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = validateServicePayload(req.body ?? {});
    if (data.isActive === undefined) data.isActive = true;
    const service = await prisma.service.create({ data });
    res.status(201).json({ service });
  })
);

// PATCH /api/services/:id — yalnızca admin (aktif/pasif toggle dahil)
router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFoundError("Hizmet bulunamadı");

    const data = validateServicePayload(req.body ?? {}, { partial: true });
    const service = await prisma.service.update({ where: { id: req.params.id }, data });
    res.json({ service });
  })
);

// DELETE /api/services/:id — yalnızca admin
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFoundError("Hizmet bulunamadı");

    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);

export default router;
