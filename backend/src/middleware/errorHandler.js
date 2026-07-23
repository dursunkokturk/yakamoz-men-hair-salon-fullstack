import { AppError } from "../utils/AppError.js";

/** 404 için — hiçbir route eşleşmediğinde çalışır. */
export function notFoundHandler(req, _res, next) {
  next(new AppError(`Bulunamadı: ${req.method} ${req.originalUrl}`, { statusCode: 404, code: "NOT_FOUND" }));
}

/** Tüm hataları tek noktadan, tutarlı bir JSON gövdesiyle yanıtlar. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Prisma bilinen hata kodları (örn. P2002 unique constraint)
  if (err?.code?.startsWith?.("P")) {
    return res.status(409).json({
      error: { code: "DATABASE_ERROR", message: "Veritabanı işlemi sırasında bir hata oluştu" },
    });
  }

  console.error("Beklenmeyen hata:", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Sunucu hatası, lütfen daha sonra tekrar deneyin" },
  });
}

/** async route handler'larda try/catch tekrarını önlemek için sarmalayıcı. */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
