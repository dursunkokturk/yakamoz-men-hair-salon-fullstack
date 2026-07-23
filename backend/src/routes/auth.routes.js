import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { AppError, unauthorizedError, validationError } from "../utils/AppError.js";
import { isNonEmptyString } from "../utils/validation.js";

const router = Router();

function signToken(admin) {
  return jwt.sign({ sub: admin.id, username: admin.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

// POST /api/auth/login  { username, password }
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      throw validationError("Kullanıcı adı ve şifre zorunludur");
    }

    const admin = await prisma.admin.findUnique({ where: { username: username.trim() } });
    if (!admin) throw unauthorizedError("Kullanıcı adı veya şifre hatalı");

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) throw unauthorizedError("Kullanıcı adı veya şifre hatalı");

    const token = signToken(admin);
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  })
);

// GET /api/auth/me — geçerli oturumun sahibini döner (sayfa yenilendiğinde oturum doğrulamak için)
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ admin: req.admin });
  })
);

// PATCH /api/auth/password  { currentPassword, newPassword }
router.patch(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
      throw validationError("Mevcut şifre ve yeni şifre zorunludur");
    }
    if (newPassword.length < 6) {
      throw validationError("Yeni şifre en az 6 karakter olmalıdır");
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
    if (!admin) throw unauthorizedError();

    const currentMatches = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!currentMatches) {
      throw new AppError("Mevcut şifre hatalı", { statusCode: 400, code: "WRONG_CURRENT_PASSWORD" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });

    res.json({ success: true });
  })
);

export default router;
