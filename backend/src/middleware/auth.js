import jwt from "jsonwebtoken";
import { unauthorizedError } from "../utils/AppError.js";

/** Authorization: Bearer <token> başlığını doğrular, req.admin = { id, username } atar. */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(unauthorizedError("Giriş yapmanız gerekiyor"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(unauthorizedError("Oturumunuzun süresi doldu, lütfen tekrar giriş yapın"));
    }
    return next(unauthorizedError("Geçersiz oturum belirteci (token)"));
  }
}
