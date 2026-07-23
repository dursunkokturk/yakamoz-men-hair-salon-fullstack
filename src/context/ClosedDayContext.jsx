import { createContext, useContext, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";

const ClosedDayContext = createContext(null);

export function ClosedDayProvider({ children }) {
  const [closedDays, setClosedDays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    const { closedDays: fetched } = await api.getClosedDays();
    setClosedDays(fetched);
    return fetched;
  }

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((err) => console.error("Kapalı Günler Yüklenemedi:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function addClosedDay(date, reason = "") {
    try {
      const { closedDay: entry } = await api.addClosedDay(date, reason);
      setClosedDays((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
      return entry;
    } catch (err) {
      // ClosedDaysManager.jsx Hâlâ err.message === "ALREADY_CLOSED" Kontrolu Yapabilsin Diye
      if (err instanceof ApiError && err.details?.code === "ALREADY_CLOSED") {
        throw new Error("ALREADY_CLOSED");
      }
      throw err;
    }
  }

  async function removeClosedDay(id) {
    await api.removeClosedDay(id);
    setClosedDays((prev) => prev.filter((d) => d.id !== id));
  }

  function isDateClosed(dateISO) {
    return closedDays.some((d) => d.date === dateISO);
  }

  function getClosedDayInfo(dateISO) {
    return closedDays.find((d) => d.date === dateISO) || null;
  }

  return (
    <ClosedDayContext.Provider
      value={{ closedDays, addClosedDay, removeClosedDay, isDateClosed, getClosedDayInfo }}
    >
      {children}
    </ClosedDayContext.Provider>
  );
}

export function useClosedDays() {
  const ctx = useContext(ClosedDayContext);
  if (!ctx) throw new Error("useClosedDays, ClosedDayProvider içinde kullanılmalı");
  return ctx;
}