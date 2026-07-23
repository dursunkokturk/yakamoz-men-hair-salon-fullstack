// İsim/soyisim: sadece harf (TR karakterler dahil) ve tek boşluklar
const NAME_REGEX = /^[A-Za-zÇçĞğİıÖöŞşÜü]+(?: [A-Za-zÇçĞğİıÖöŞşÜü]+)*$/;

// Türkiye cep telefonu: "0555 555 55 55" formatı
const PHONE_DISPLAY_REGEX = /^0\d{3} \d{3} \d{2} \d{2}$/;

export function normalizeName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").normalize("NFC");
}

export function isValidName(value) {
  const normalized = normalizeName(value);
  return normalized.length >= 2 && NAME_REGEX.test(normalized);
}

export function isValidPhone(value) {
  return PHONE_DISPLAY_REGEX.test(String(value ?? "").trim());
}

/** İsim karşılaştırması için normalize edilmiş, küçük harfli anahtar üretir. */
export function nameKey(value) {
  return normalizeName(value).toLocaleLowerCase("tr-TR");
}

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
