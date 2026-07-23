import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { AppError, conflictError, notFoundError, validationError } from "../utils/AppError.js";
import {
  MAX_APPOINTMENTS_PER_SLOT,
  generateTimeSlots,
  getDateClosureInfo,
  isPastDateTime,
  isValidDateISO,
  isValidTime,
} from "../utils/dateUtils.js";
import { isValidName, isValidPhone, normalizeName } from "../utils/validation.js";
import { isCustomerBlocked } from "./blockedCustomers.routes.js";

const router = Router();

export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const VALID_STATUSES = Object.values(APPOINTMENT_STATUS);

async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings ?? (await prisma.settings.create({ data: { id: 1 } }));
}

async function getClosedDaysMap() {
  const closedDays = await prisma.closedDay.findMany();
  return new Map(closedDays.map((d) => [d.date, d]));
}

/** Bir tarih+saat dilimindeki, iptal edilmemiş randevu sayısını döner. */
async function countActiveAppointmentsAt(date, time, excludeId = null) {
  return prisma.appointment.count({
    where: {
      date,
      time,
      status: { not: APPOINTMENT_STATUS.CANCELLED },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

/** Randevu oluşturma/erteleme öncesi ortak iş kuralı kontrolleri (Bölüm 5, 6, 10, 11, 12). */
async function assertBookable({ date, time, excludeAppointmentId = null }) {
  const [settings, closedDaysMap] = await Promise.all([getSettings(), getClosedDaysMap()]);

  const { isClosed, reason } = getDateClosureInfo(date, {
    closedWeekday: settings.closedWeekday,
    closedDaysMap,
  });
  if (isClosed) {
    throw new AppError(reason || "İşletme bu tarihte kapalı", { statusCode: 409, code: "DATE_CLOSED" });
  }

  const validSlots = new Set(generateTimeSlots(settings.workStartHour, settings.workEndHour));
  if (!validSlots.has(time)) {
    throw validationError("Geçersiz saat dilimi");
  }

  if (isPastDateTime(date, time)) {
    throw new AppError("Geçmiş bir tarih/saat için randevu oluşturulamaz", {
      statusCode: 409,
      code: "PAST_DATETIME",
    });
  }

  const takenCount = await countActiveAppointmentsAt(date, time, excludeAppointmentId);
  if (takenCount >= MAX_APPOINTMENTS_PER_SLOT) {
    throw new AppError("Bu saat dolu, lütfen başka bir saat seçin", { statusCode: 409, code: "SLOT_FULL" });
  }
}

// ---------------------------------------------------------------------------
// GET /api/appointments/availability?date=YYYY-MM-DD — herkese açık
// BookAppointment / AdminPanel reschedule ekranlarının kullandığı uç nokta.
// ---------------------------------------------------------------------------
router.get(
  "/availability",
  asyncHandler(async (req, res) => {
    const date = String(req.query.date ?? "");
    if (!isValidDateISO(date)) throw validationError("Geçerli bir tarih (YYYY-MM-DD) belirtiniz");

    const [settings, closedDaysMap] = await Promise.all([getSettings(), getClosedDaysMap()]);
    const { isClosed, reason } = getDateClosureInfo(date, {
      closedWeekday: settings.closedWeekday,
      closedDaysMap,
    });

    if (isClosed) {
      return res.json({ isOpen: false, slots: [], closedReason: reason });
    }

    const times = generateTimeSlots(settings.workStartHour, settings.workEndHour);
    const counts = await prisma.appointment.groupBy({
      by: ["time"],
      where: { date, status: { not: APPOINTMENT_STATUS.CANCELLED } },
      _count: { time: true },
    });
    const countMap = new Map(counts.map((c) => [c.time, c._count.time]));

    const slots = times.map((time) => {
      const takenCount = countMap.get(time) ?? 0;
      const isPast = isPastDateTime(date, time);
      return {
        time,
        takenCount,
        remaining: Math.max(0, MAX_APPOINTMENTS_PER_SLOT - takenCount),
        isFull: takenCount >= MAX_APPOINTMENTS_PER_SLOT,
        isPast,
        isDisabled: takenCount >= MAX_APPOINTMENTS_PER_SLOT || isPast,
      };
    });

    res.json({ isOpen: true, slots, closedReason: null });
  })
);

// ---------------------------------------------------------------------------
// GET /api/appointments/lookup?phone=0555 555 55 55 — herkese açık (Randevularım sayfası)
// ---------------------------------------------------------------------------
router.get(
  "/lookup",
  asyncHandler(async (req, res) => {
    const phone = String(req.query.phone ?? "").trim();
    if (!isValidPhone(phone)) throw validationError("Telefon '0555 555 55 55' formatında olmalı");

    const appointments = await prisma.appointment.findMany({
      where: { phone },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });
    res.json({ appointments });
  })
);

// ---------------------------------------------------------------------------
// GET /api/appointments — yalnızca admin; ?date=&status=&serviceId=&customerName= filtreleri destekler
// ---------------------------------------------------------------------------
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { date, status, serviceId, customerName } = req.query;
    const where = {};

    if (date) {
      if (!isValidDateISO(String(date))) throw validationError("Geçersiz tarih filtresi");
      where.date = String(date);
    }
    if (status && status !== "all") {
      if (!VALID_STATUSES.includes(String(status))) throw validationError("Geçersiz durum filtresi");
      where.status = String(status);
    }
    if (serviceId && serviceId !== "all") {
      where.serviceId = String(serviceId);
    }
    if (customerName && String(customerName).trim()) {
      where.fullName = { contains: String(customerName).trim(), mode: "insensitive" };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
    res.json({ appointments });
  })
);

// ---------------------------------------------------------------------------
// POST /api/appointments — herkese açık (Randevu Al akışı, Bölüm 5)
// Sıra: 1) engellenen müşteri kontrolü  2) kapalı gün kontrolü
//        3) kontenjan kontrolü          4) randevu "pending" olarak oluşturulur
// ---------------------------------------------------------------------------
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { fullName, phone, date, time, serviceId } = req.body ?? {};

    if (!isValidName(fullName)) throw validationError("Geçerli bir ad soyad giriniz");
    if (!isValidPhone(phone)) throw validationError("Telefon '0555 555 55 55' formatında olmalı");
    if (!isValidDateISO(date)) throw validationError("Geçerli bir tarih seçiniz");
    if (!isValidTime(time)) throw validationError("Geçerli bir saat seçiniz");
    if (!isNonEmptyServiceId(serviceId)) throw validationError("Lütfen bir işlem seçin");

    const normalizedFullName = normalizeName(fullName);
    const trimmedPhone = phone.trim();

    // 1) Engellenen müşteri kontrolü
    if (await isCustomerBlocked(normalizedFullName, trimmedPhone)) {
      throw new AppError("Bu isimle randevu oluşturulamıyor. Lütfen berberle iletişime geçin.", {
        statusCode: 403,
        code: "CUSTOMER_BLOCKED",
      });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) throw validationError("Seçilen işlem artık mevcut değil");

    // 2) Kapalı gün + 3) kontenjan kontrolü
    await assertBookable({ date, time });

    // 4) Randevu oluşturulur (varsayılan durum: "pending" / Onay Bekliyor)
    const appointment = await prisma.appointment.create({
      data: {
        fullName: normalizedFullName,
        phone: trimmedPhone,
        date,
        time,
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        status: APPOINTMENT_STATUS.PENDING,
      },
    });

    res.status(201).json({ appointment });
  })
);

function isNonEmptyServiceId(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id — yalnızca admin
// Gövde: { status } (onayla/iptal/tamamlandı) VEYA { date, time } (tarih değiştirme)
// ---------------------------------------------------------------------------
router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) throw notFoundError("Randevu bulunamadı");

    const { status, date, time } = req.body ?? {};
    const data = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) throw validationError("Geçersiz randevu durumu");
      data.status = status;
    }

    const wantsReschedule = date !== undefined || time !== undefined;
    if (wantsReschedule) {
      const newDate = date ?? appointment.date;
      const newTime = time ?? appointment.time;
      if (!isValidDateISO(newDate)) throw validationError("Geçerli bir tarih seçiniz");
      if (!isValidTime(newTime)) throw validationError("Geçerli bir saat seçiniz");

      await assertBookable({ date: newDate, time: newTime, excludeAppointmentId: appointment.id });
      data.date = newDate;
      data.time = newTime;
    }

    if (Object.keys(data).length === 0) {
      throw validationError("Güncellenecek bir alan belirtilmedi");
    }

    const updated = await prisma.appointment.update({ where: { id: appointment.id }, data });
    res.json({ appointment: updated });
  })
);

// ---------------------------------------------------------------------------
// DELETE /api/appointments/:id — yalnızca admin
// ---------------------------------------------------------------------------
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) throw notFoundError("Randevu bulunamadı");

    await prisma.appointment.delete({ where: { id: appointment.id } });
    res.json({ success: true });
  })
);

export default router;
