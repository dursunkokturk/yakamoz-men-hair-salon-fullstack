import { createContext, useContext, useEffect, useState } from "react";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "../utils/storage";

const ThemeContext = createContext(null);

const THEMES = { LIGHT: "light", DARK: "dark" };

function getInitialTheme() {
  const stored = loadFromStorage(STORAGE_KEYS.THEME, null);
  if (stored === THEMES.LIGHT || stored === THEMES.DARK) return stored;

  // Sistem tercihine göre varsayılan tema (kullanıcı hiç seçim yapmadıysa)
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return THEMES.LIGHT;
  }
  return THEMES.DARK;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveToStorage(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === THEMES.DARK }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme, ThemeProvider içinde kullanılmalı");
  return ctx;
}