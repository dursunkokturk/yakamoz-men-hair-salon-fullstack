import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const ServiceContext = createContext(null);

export function ServiceProvider({ children }) {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    const { services: fetched } = await api.getServices();
    setServices(fetched);
    return fetched;
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    refresh()
      .catch((err) => console.error("Hizmetler yüklenemedi:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function addService(service) {
    const { service: newService } = await api.createService(service);
    setServices((prev) => [...prev, newService]);
    return newService;
  }

  async function updateService(id, updates) {
    const { service: updated } = await api.updateService(id, updates);
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  async function deleteService(id) {
    await api.deleteService(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  // Aktif / Pasif toggle
  async function toggleServiceStatus(id) {
    await api.deleteService(id);
    setServices((prev) => prev.filter((s) => (s.id === id)));
  }

  function getServiceById(id) {
    return services.find((s) => s.id === id) || null;
  }

  // Musteri Tarafinda Sadece Aktif Hizmetler Gosterilecek
  const activeServices = services.filter((s) => s.isActive !== false);

  return (
    <ServiceContext.Provider
      value={{ services, activeServices, addService, updateService, deleteService, toggleServiceStatus, getServiceById, refresh }}
    >
      {children}
    </ServiceContext.Provider>
  );
}

export function useServices() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error("useServices, ServiceProvider içinde kullanılmalı");
  return ctx;
}
