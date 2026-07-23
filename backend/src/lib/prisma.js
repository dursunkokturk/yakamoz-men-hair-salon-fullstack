import { PrismaClient } from "@prisma/client";

// Geliştirme modunda (nodemon/--watch ile) her yeniden yüklemede yeni bir
// PrismaClient oluşturulmasını önlemek için global'e cache'lenir.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
