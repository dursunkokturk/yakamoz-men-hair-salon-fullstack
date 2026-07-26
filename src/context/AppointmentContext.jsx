import { createContext, useContext, useState } from "react";
import { api, ApiError } from "../api/client";

const AppointmentContext = createContext(null);

export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// Backend Hata Kodlarini, 
// Mevcut UI'nin Bekledigi 
// err.message Degerlerine Cevirir
function rethrowAsLegacyError(err) {
  if (err instanceof ApiError) throw new Error(err.message); // ApiError.message Zaten Backend'in "code" Alani
  throw err;
}

export function AppointmentProvider({ children }) {
  // Artik Tum Randevular localStorage'da Degil, Backend'de Tutuluyor.
  // Admin Panelinde Gun Bazli Cekiyoruz; "Randevularım" Sayfasi Telefonla Sorguluyor.
  const [appointments, setAppointments] = useState([]);

  // POST /api/appointments (Kapali Gun/Kontenjan/Engel
  // Kontrolleri Artik Backend'de Yapiliyor; 
  // Hata Durumunda Backend'in Kodu
  // (DATE_CLOSED / SLOT_FULL / CUSTOMER_BLOCKED) fırlatılıyor)
  async function createAppointment(data) {
    try {
      const { appointment } = await api.createAppointment(data);
      setAppointments((prev) => [...prev, appointment]);
      return appointment;
    } catch (err) {
      rethrowAsLegacyError(err);
    }
  }

  // PATCH /api/appointments/:id { status: "approved" }
  async function approveAppointment(id) {
    const { appointment } = await api.updateAppointment(id, { status: APPOINTMENT_STATUS.APPROVED });
    setAppointments((prev) => prev.map((a) => (a.id === id ? appointment : a)));
  }

  async function completeAppointment(id) {
    const { appointment } = await api.updateAppointment(id, { status: APPOINTMENT_STATUS.COMPLETED });
    setAppointments((prev) => prev.map((a) => (a.id === id ? appointment : a)));
  }

  async function cancelAppointment(id) {
    const { appointment } = await api.updateAppointment(id, { status: APPOINTMENT_STATUS.CANCELLED });
    setAppointments((prev) => prev.map((a) => (a.id === id ? appointment : a)));
  }

  async function deleteAppointment(id) {
    await api.deleteAppointment(id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }

  // PATCH /api/appointments/:id { date, time }
  async function rescheduleAppointment(id, newDate, newTime) {
    try {
      const { appointment } = await api.updateAppointment(id, { date: newDate, time: newTime });
      setAppointments((prev) => prev.map((a) => (a.id === id ? appointment : a)));
    } catch (err) {
      rethrowAsLegacyError(err);
    }
  }

  // Artik Backend'den GET /api/appointments?date=... Cekiyor
  // ve Sonucu state'e Yaziyor (AdminPanel Bunu Her Gun/Tarih Degistiginde Cagirir)
  async function fetchByDate(date) {
    const { appointments: fetched } = await api.getAppointments({ date });
    setAppointments((prev) => {
      const others = prev.filter((a) => a.date !== date);
      return [...others, ...fetched];
    });
    return fetched;
  }

  function getAppointmentsByDate(date) {
    return appointments.filter((a) => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
  }

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        createAppointment,
        approveAppointment,
        completeAppointment,
        cancelAppointment,
        deleteAppointment,
        rescheduleAppointment,
        getAppointmentsByDate,
        fetchByDate,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const ctx = useContext(AppointmentContext);
  if (!ctx) throw new Error("useAppointments, AppointmentProvider içinde kullanılmalı");
  return ctx;
}