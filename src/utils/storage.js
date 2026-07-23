// Basit localStorage sarmalayıcı — tüm veri kalıcılığı bu dosya üzerinden yürür.

export function loadFromStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`storage: "${key}" okunamadı`, err);
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    if (value === null || value || undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key,JSON.stringify(value));
  } catch (err) {
    console.error(`storage: "${key}" kaydedilemedi`, err);
  }
}

export const STORAGE_KEYS = {
  AUTH_TOKEN: "yakamoz_auth_token",
  THEME: "yakamoz_theme",
  ADMIN_FILTERS: "yakamoz_admin_filters",
};
