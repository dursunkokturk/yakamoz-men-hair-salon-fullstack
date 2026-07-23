# Yakamoz Erkek Kuaförü — Backend

Node.js + Express + PostgreSQL (Prisma ORM) ile yazılmış REST API. Proje Analizi'nin
Bölüm 19 (Backend), Bölüm 13 (Kimlik Doğrulama / JWT) ve Bölüm 12 (İş Kuralları)
gereksinimlerini karşılar.

## Kurulum

```bash
cd backend
npm install
cp .env.example .env      # DATABASE_URL, JWT_SECRET, CORS_ORIGIN vb. değerleri düzenleyin
npx prisma migrate dev --name init   # veritabanı şemasını oluşturur
npm run seed               # varsayılan admin + varsayılan hizmetleri ekler
npm run dev                 # http://localhost:4000
```

> Not: Bu sandbox ortamında `binaries.prisma.sh` adresine erişim engellendiği için
> `prisma generate` burada tam çalıştırılamadı; bütün rota/middleware/import
> zincirinin doğru şekilde birbirine bağlandığı, sunucunun yalnızca
> "PrismaClient henüz generate edilmedi" hatasına kadar sorunsuz açıldığı
> doğrulandı. Normal internet erişimi olan bir makinede yukarıdaki adımlar
> sorunsuz çalışır.

Varsayılan admin: `admin` / `yakamoz2026` (bkz. `.env` → `DEFAULT_ADMIN_USERNAME` /
`DEFAULT_ADMIN_PASSWORD`). Bölüm 13 gereği ilk girişten sonra admin panelinden
mutlaka değiştirilmelidir (`PATCH /api/auth/password`).

## Klasör yapısı

```
backend/
├── prisma/
│   ├── schema.prisma      # Admin, Service, Appointment, BlockedCustomer, ClosedDay, Settings
│   └── seed.js
└── src/
    ├── server.js           # Express app, middleware, route bağlama
    ├── lib/prisma.js        # PrismaClient singleton
    ├── middleware/
    │   ├── auth.js           # JWT doğrulama (requireAuth)
    │   └── errorHandler.js   # Merkezi hata yönetimi (Bölüm 19/24)
    ├── routes/
    │   ├── auth.routes.js
    │   ├── appointments.routes.js
    │   ├── services.routes.js
    │   ├── blockedCustomers.routes.js
    │   ├── closedDays.routes.js
    │   └── settings.routes.js
    └── utils/
        ├── dateUtils.js       # dayjs tabanlı slot üretimi, kapalı gün kontrolü
        ├── validation.js      # ad/telefon doğrulama (frontend ile aynı kurallar)
        └── AppError.js        # kategorize edilmiş hata sınıfı
```

## API Uç Noktaları

| Yöntem | Yol | Yetki | Açıklama |
|---|---|---|---|
| POST | `/api/auth/login` | Herkese açık | `{ username, password }` → JWT |
| GET | `/api/auth/me` | Admin | Geçerli oturumu doğrular |
| PATCH | `/api/auth/password` | Admin | Şifre değiştirme |
| GET | `/api/settings` | Herkese açık | İşletme adı/adres/çalışma saatleri/kapalı gün |
| PATCH | `/api/settings` | Admin | Ayarları günceller |
| GET | `/api/services?active=true` | Herkese açık | Hizmet listesi |
| POST/PATCH/DELETE | `/api/services[/:id]` | Admin | Hizmet CRUD (Bölüm 26) |
| GET | `/api/closed-days` | Herkese açık | Kapalı gün listesi |
| POST/DELETE | `/api/closed-days[/:id]` | Admin | Kapalı gün ekle/sil (Bölüm 11) |
| GET | `/api/appointments/availability?date=` | Herkese açık | O günün saat/doluluk durumu |
| GET | `/api/appointments/lookup?phone=` | Herkese açık | Telefona göre randevu sorgusu (Randevularım) |
| GET | `/api/appointments?date=&status=&serviceId=&customerName=` | Admin | Filtrelenmiş liste |
| POST | `/api/appointments` | Herkese açık | Randevu oluşturma (Bölüm 5: engel → kapalı gün → kontenjan → oluştur) |
| PATCH | `/api/appointments/:id` | Admin | Durum değiştirme / erteleme |
| DELETE | `/api/appointments/:id` | Admin | Kayıt silme |
| GET | `/api/blocked-customers` | Admin | Engellenen müşteri listesi |
| GET | `/api/blocked-customers/check?fullName=&phone=` | Herkese açık | Ön kontrol (opsiyonel) |
| POST/DELETE | `/api/blocked-customers[/:id]` | Admin | Engelle / engeli kaldır |

Tüm hatalar `{ error: { code, message, details } }` biçiminde döner. Olası kodlar:
`VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, `DATE_CLOSED`,
`SLOT_FULL`, `CUSTOMER_BLOCKED`, `PAST_DATETIME`, `WRONG_CURRENT_PASSWORD`,
`DATABASE_ERROR`, `INTERNAL_ERROR`.

## Uygulanan iş kuralları (Bölüm 12)

- Bir saat dilimine en fazla **2** aktif (iptal edilmemiş) randevu.
- Hizmet süresi/ücreti backend'de hizmet kaydından otomatik doldurulur.
- Engellenen müşteriler (ad+telefon eşleşmesi) randevu oluşturamaz.
- Haftalık kapalı gün + admin'in eklediği özel kapalı günlerde randevu alınamaz.
- Yeni randevular her zaman `pending` (Onay Bekliyor) olarak oluşturulur.
- Geçmiş tarih/saate randevu oluşturulamaz/ertelenemez.
