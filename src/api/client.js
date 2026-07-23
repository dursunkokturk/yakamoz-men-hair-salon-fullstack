import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "../utils/storage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "yakamoz_auth_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Tüm API çağrıları bu fonksiyondan geçer.
 * - Otomatik olarak Authorization header'ı ekler (varsa)
 * - Hataları backend'in { error, message } formatına göre normalize eder
 */
async function request(path, { method = "GET", body, skipAuth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token && !skipAuth) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    // gövde boş olabilir (örn. bazı hata durumlarında)
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Bir hata oluştu");
    error.code = data?.error || "UNKNOWN_ERROR";
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
