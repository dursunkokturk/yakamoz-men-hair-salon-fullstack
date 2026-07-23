// Section 19/24 (Error Handler): Network, Validation, JWT, Veritabanı, Yetkisiz erişim
// kategorilerini tek bir hata sınıfı ve tutarlı bir HTTP durum koduyla temsil eder.

export class AppError extends Error {
  constructor(message, { statusCode = 400, code = "VALIDATION_ERROR", details = null } = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code; // VALIDATION_ERROR | UNAUTHORIZED | NOT_FOUND | CONFLICT | DATABASE_ERROR
    this.details = details;
  }
}

export function validationError(message, details = null) {
  return new AppError(message, { statusCode: 400, code: "VALIDATION_ERROR", details });
}

export function unauthorizedError(message = "Yetkisiz erişim") {
  return new AppError(message, { statusCode: 401, code: "UNAUTHORIZED" });
}

export function notFoundError(message = "Kayıt bulunamadı") {
  return new AppError(message, { statusCode: 404, code: "NOT_FOUND" });
}

export function conflictError(message, details = null) {
  return new AppError(message, { statusCode: 409, code: "CONFLICT", details });
}
