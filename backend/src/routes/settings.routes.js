import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { validationError } from "../utils/AppError.js";

const router = Router();

async function getOrCreateSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings) return settings;
  return prisma.settings.create({ data: { id: 1 } });
}

// GET /api/settings — herkese açık (Footer, Calendar, useAvailability bunu kullanır)
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await getOrCreateSettings();
    res.json({ settings });
  })
);

// PATCH /api/settings — yalnızca admin (çalışma günleri/saatleri ve işletme bilgileri)
router.patch(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { businessName, phone, address, workStartHour, workEndHour, closedWeekday } = req.body ?? {};
    const data = {};

    if (businessName !== undefined) data.businessName = String(businessName).trim();
    if (phone !== undefined) data.phone = String(phone).trim();
    if (address !== undefined) data.address = String(address).trim();

    if (workStartHour !== undefined) {
      const n = Number(workStartHour);
      if (!Number.isInteger(n) || n < 0 || n > 23) throw validationError("Geçersiz açılış saati");
      data.workStartHour = n;
    }
    if (workEndHour !== undefined) {
      const n = Number(workEndHour);
      if (!Number.isInteger(n) || n < 1 || n > 24) throw validationError("Geçersiz kapanış saati");
      data.workEndHour = n;
    }
    if (closedWeekday !== undefined) {
      const n = Number(closedWeekday);
      if (!Number.isInteger(n) || n < 0 || n > 6) throw validationError("Geçersiz haftalık kapalı gün");
      data.closedWeekday = n;
    }

    await getOrCreateSettings();
    const settings = await prisma.settings.update({ where: { id: 1 }, data });
    res.json({ settings });
  })
);

export default router;
