import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SERVICES = [
  { name: "Saç Kesimi", durationMinutes: 30, price: 300, isActive: true },
  { name: "Sakal Tıraşı", durationMinutes: 20, price: 200, isActive: true },
  { name: "Saç + Sakal", durationMinutes: 45, price: 450, isActive: true },
  { name: "Çocuk Saç Kesimi", durationMinutes: 25, price: 250, isActive: true },
  { name: "Fön / Şekillendirme", durationMinutes: 15, price: 150, isActive: true },
];

async function main() {
  // --- Varsayılan Admin ---
  const username = process.env.DEFAULT_ADMIN_USERNAME || "admin";
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "yakamoz2026";

  const existingAdmin = await prisma.admin.findUnique({ where: { username } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.admin.create({ data: { username, passwordHash } });
    console.log(`✔ Varsayılan admin oluşturuldu: ${username} / ${password}`);
    console.log("  Güvenlik için ilk girişten sonra şifreyi admin panelinden değiştirin.");
  } else {
    console.log(`• Admin "${username}" zaten mevcut, atlanıyor.`);
  }

  // --- Varsayılan Ayarlar (tek satır, id=1) ---
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  console.log("✔ Varsayılan ayarlar hazır.");

  // --- Varsayılan Hizmetler (tablo boşsa) ---
  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    await prisma.service.createMany({ data: DEFAULT_SERVICES });
    console.log(`✔ ${DEFAULT_SERVICES.length} varsayılan hizmet eklendi.`);
  } else {
    console.log("• Hizmetler tablosu zaten dolu, atlanıyor.");
  }
}

main()
  .catch((err) => {
    console.error("Seed hatası:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
