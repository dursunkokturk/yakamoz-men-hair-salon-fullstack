import { createContext, useContext, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { saveToStorage, STORAGE_KEYS } from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => loadFromStorage(STORAGE_KEYS.AUTH_TOKEN, null));
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true); // Ilk Yuklemede /auth/me Dogrulanana Kadar

  // Sayfa Yenilendiginde, Token Backend Uzerinden Dogrula.
  useEffect(() => {
    let cancelled = false;
    async function verifySession() {
      if (!token) {
        setIsCheckingSession(false);
        return;
      }
      try {
        const { admin } = await api.me();
        if (!cancelled) {
          setAdminUsername(admin.username);
          setIsAuthenticated(true);
        }
      } catch {
        // Token Gecersiz/Suresi Dolmus — Sessizce Oturumu Temizle
        if (!cancelled) {
          setToken(null);
          saveToStorage(STORAGE_KEYS.AUTH_TOKEN, null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    }

    verifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Backend'e Istek Atiyor
  async function login(username, password) {
    try {
      const { token: newToken, admin } = await api.login(username, password);
      setToken(newToken);
      saveToStorage(STORAGE_KEYS.AUTH_TOKEN, newToken)
      setAdminUsername(admin.username);
      setIsAuthenticated(true)
      return newToken;
    } catch (err) {
      // Login.jsx hâlâ err.message === "INVALID_CREDENTIALS" Gibi Kontrol Edebilsin Diye
      // Backend'in kodu (UNAUTHORIZED) frontend'in Bekledigi Isme Cevriliyor.
      if (err instanceof ApiError) throw new Error("INVALID_CREDENTIALS");
      throw err;
    }
  }

  function logout() {
    setToken(null);
    setAdmin(null);
  }

  // PATCH /api/auth/password Cagiriyor
  async function changePassword(currentPassword, newPassword) {
    try {
      await api.changePassword(currentPassword, newPassword);
    } catch (err) {
      if (err instanceof ApiError) {
        // Backend Kodlari: WRONG_CURRENT_PASSWORD | VALIDATION_ERROR
        throw new Error(err.message === "WRONG_CURRENT_PASSWORD" ? "WRONG_CURRENT_PASSWORD" : "WEAK_PASSWORD");
      }
      throw err;
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isCheckingSession, adminUsername, login, logout, changePassword, }} >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  return ctx;
}