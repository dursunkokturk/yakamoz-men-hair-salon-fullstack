import { createContext, useContext, useEffect, useState } from "react";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "../utils/storage";
import { api } from "../api/client";

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  businessName: "Yakamoz Erkek Kuaförü",
  phone: "0532 123 45 67",
  address: "Merkez Mahallesi, Berber Sokak No:1",
  workStartHour: 9,
  workEndHour: 19,
  closedWeekday: 1, // Salı — dayjs weekday(): 0=Pazartesi, 1=Salı
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Backend'den Gelen Guncel Ayarlari Aliyoruz
  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then(({ settings: fetched }) => {
        if (!cancelled) setSettings(fetched);
      })
      .catch((err) => console.error("Ayarlar Yüklenemedi:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    }
  }, []);

  async function updateSettings(updates) {
    const{settings:updated}=await api.updateSettings(updates);
    setSettings(updated);
    return updated;
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings, SettingsProvider içinde kullanılmalı");
  return ctx;
}
