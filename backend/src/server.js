import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes.js";
import appointmentsRoutes from "./routes/appointments.routes.js";
import servicesRoutes from "./routes/services.routes.js";
import blockedCustomersRoutes from "./routes/blockedCustomers.routes.js";
import closedDaysRoutes from "./routes/closedDays.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

// ---- Güvenlik / temel ayarlar ----
app.disable("x-powered-by");

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Randevu oluşturma/giriş gibi uçlar için hafif bir rate limit (kaba kuvvet / spam koruması)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(["/api/auth/login", "/api/appointments"], (req, res, next) => {
  if (req.method === "GET") return next();
  return writeLimiter(req, res, next);
});

// ---- Sağlık kontrolü ----
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---- Rotalar (Bölüm 19 — Backend / API İşlemleri) ----
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/blocked-customers", blockedCustomersRoutes);
app.use("/api/closed-days", closedDaysRoutes);
app.use("/api/settings", settingsRoutes);

// ---- Hata yönetimi (Bölüm 19/24: Network, Validation, JWT, Veritabanı, Yetkisiz erişim) ----
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✔ Yakamoz backend ${PORT} portunda çalışıyor (http://localhost:${PORT})`);
});

export default app;
