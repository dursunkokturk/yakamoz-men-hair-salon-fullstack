import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { notFoundError, validationError } from "../utils/AppError.js";
import { isValidName, isValidPhone, nameKey, normalizeName } from "../utils/validation.js";

const router = Router();

// GET /api/blocked-customers — yalnızca admin
router.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const blockedCustomers = await prisma.blockedCustomer.findMany({ orderBy: { blockedAt: "desc" } });
    res.json({ blockedCustomers });
  })
);

// GET /api/blocked-customers/check?fullName=&phone= — herkese açık
// Randevu formu, kayıt oluşturmadan önce bu uç noktayla ön kontrol yapabilir
// (asıl kontrol yine de POST /api/appointments içinde zorunlu olarak tekrarlanır).
router.get(
  "/check",
  asyncHandler(async (req, res) => {
    const fullName = String(req.query.fullName ?? "");
    const phone = String(req.query.phone ?? "");
    if (!fullName || !phone) throw validationError("Ad Soyad ve telefon zorunludur");

    const blocked = await isCustomerBlocked(fullName, phone);
    res.json({ isBlocked: blocked });
  })
);

export async function isCustomerBlocked(fullName, phone) {
  const key = nameKey(fullName);
  const trimmedPhone = String(phone).trim();
  const candidates = await prisma.blockedCustomer.findMany({ where: { phone: trimmedPhone } });
  return candidates.some((b) => nameKey(b.fullName) === key);
}

// POST /api/blocked-customers  { fullName, phone, reason } — yalnızca admin
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { fullName, phone, reason = "" } = req.body ?? {};
    if (!isValidName(fullName)) throw validationError("Geçerli bir ad soyad giriniz");
    if (!isValidPhone(phone)) throw validationError("Telefon '0555 555 55 55' formatında olmalı");

    const entry = await prisma.blockedCustomer.create({
      data: { fullName: normalizeName(fullName), phone: phone.trim(), reason: String(reason).trim() },
    });
    res.status(201).json({ blockedCustomer: entry });
  })
);

// DELETE /api/blocked-customers/:id — yalnızca admin (engeli kaldırma)
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.blockedCustomer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFoundError("Engellenen müşteri kaydı bulunamadı");

    await prisma.blockedCustomer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);

export default router;
