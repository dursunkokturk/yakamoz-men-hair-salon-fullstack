import { useEffect, useState } from "react";
import { api } from "../api/client";

const EMPTY_RESULT = { isOpen: false, slots: [], closedReason: null }
/**
 * Verilen tarih için tüm saat dilimlerini, her birinin dolu/boş durumuyla birlikte döner.
 * Salı günleri ve geçmiş saatler otomatik olarak pasif sayılır.
 */
export function useAvailability(dateISO) {
  const [result, setResult] = useState(EMPTY_RESULT);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!dateISO) {
      setResult(EMPTY_RESULT);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    api
      .getAvailability(dateISO)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        console.error("Uygun saatler alınamadı:", err);
        if (!cancelled) setResult(EMPTY_RESULT);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateISO]);

  return { ...result, isLoading };
}
