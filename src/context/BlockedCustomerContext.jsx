import { createContext, useContext, useEffect, useState } from "react";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "../utils/storage";
import { nameKey } from "../utils/validation";
import { api } from "../api/client";


const BlockedCustomerContext = createContext(null);

export function BlockedCustomerProvider({ children }) {
  const [blockedCustomers, setBlockedCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Yalnizca admin (auth token'li) Cagirabilir
  async function refresh() {
    setIsLoading(true);
    try {
      const { blockedCustomers: fetched } = await api.getBlockedCustomers();
      setBlockedCustomers(fetched);
      return fetched;
    } finally {
      setIsLoading(false);
    }
  }

  function blockCustomer(fullName, phone, reason = "") {
    const { blockedCustomer: entry } = await api.blockCustomer(fullName, phone, reason);
    setBlockedCustomers((prev) => [...prev, entry]);
    return entry;
  }

  function unblockCustomer(id) {
    await api.unblockCustomer(id);
    setBlockedCustomers((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <BlockedCustomerContext.Provider
      value={{ blockedCustomers, blockCustomer, unblockCustomer, isCustomerBlocked }}
    >
      {children}
    </BlockedCustomerContext.Provider>
  );
}

export function useBlockedCustomers() {
  const ctx = useContext(BlockedCustomerContext);
  if (!ctx) throw new Error("useBlockedCustomers, BlockedCustomerProvider içinde kullanılmalı");
  return ctx;
}
