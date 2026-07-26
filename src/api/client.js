import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "../utils/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

class ApiError extends Error {
  constructor(code, message, details) {
    super(code || message);
    this.name = "ApiError";
    this.userMessage = message;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, auth = false, query } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
  }

  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = loadFromStorage(STORAGE_KEYS.AUTH_TOKEN, null);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError("NETWORK_ERROR", "İnternet bağlantınızı kontrol edin ve tekrar deneyin", networkErr);
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const errBody = payload?.error;
    if (response.status === 401) {
      saveToStorage(STORAGE_KEYS.AUTH_TOKEN, null);
    }
    throw new ApiError(errBody?.code, errBody?.message || "Sunucu hatası", errBody?.details);
  }

  return payload;
}

export const api = {
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password } }),
  me: () => request("/auth/me", { auth: true }),
  changePassword: (currentPassword, newPassword) =>
    request("/auth/password", { method: "PATCH", auth: true, body: { currentPassword, newPassword } }),

  getSettings: () => request("/settings"),
  updateSettings: (updates) => request("/settings", { method: "PATCH", auth: true, body: updates }),

  getServices: (activeOnly = false) => request("/services", { query: { active: activeOnly ? "true" : undefined } }),
  createService: (data) => request("/services", { method: "POST", auth: true, body: data }),
  updateService: (id, data) => request(`/services/${id}`, { method: "PATCH", auth: true, body: data }),
  deleteService: (id) => request(`/services/${id}`, { method: "DELETE", auth: true }),

  getBlockedCustomers: () => request("/blocked-customers", { auth: true }),
  blockCustomer: (fullName, phone, reason) =>
    request("/blocked-customers", { method: "POST", auth: true, body: { fullName, phone, reason } }),
  unblockCustomer: (id) => request(`/blocked-customers/${id}`, { method: "DELETE", auth: true }),

  getClosedDays: () => request("/closed-days"),
  addClosedDay: (date, reason) => request("/closed-days", { method: "POST", auth: true, body: { date, reason } }),
  removeClosedDay: (id) => request(`/closed-days/${id}`, { method: "DELETE", auth: true }),

  getAvailability: (date) => request("/appointments/availability", { query: { date } }),
  lookupAppointments: (phone) => request("/appointments/lookup", { query: { phone } }),
  getAppointments: (filters = {}) => request("/appointments", { auth: true, query: filters }),
  createAppointment: (data) => request("/appointments", { method: "POST", body: data }),
  updateAppointment: (id, data) => request(`/appointments/${id}`, { method: "PATCH", auth: true, body: data }),
  deleteAppointment: (id) => request(`/appointments/${id}`, { method: "DELETE", auth: true }),
};

export { ApiError };