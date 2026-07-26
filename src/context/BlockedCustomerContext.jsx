import { createContext, useContext, useEffect, useState } from "react";
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

  async function blockCustomer(fullName, phone, reason = "") {
    const { blockedCustomer: entry } = await api.blockCustomer(fullName, phone, reason);
    setBlockedCustomers((prev) => [...prev, entry]);
    return entry;
  }

  async function unblockCustomer(id) {
    await api.unblockCustomer(id);
    setBlockedCustomers((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <BlockedCustomerContext.Provider
      value={{ blockedCustomers, isLoading, blockCustomer, unblockCustomer, refresh }}
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
