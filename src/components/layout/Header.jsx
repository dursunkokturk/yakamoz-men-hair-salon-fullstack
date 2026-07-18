import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Logo } from "../visuals/Logo";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const NAV_LINKS = [
  { to: "/", label: "Ana Sayfa" },
  { to: "/hizmetler", label: "Hizmetler" },
  { to: "/randevu-al", label: "Randevu Al" },
  { to: "/randevularim", label: "Randevularım" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink to="/" className="site-header__brand" onClick={closeMenu}>
          <Logo />
        </NavLink>

        <button
          type="button"
          className="site-header__toggle"
          aria-label={isMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`site-header__nav ${isMenuOpen ? "site-header__nav--open" : ""}`}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `site-header__link ${isActive ? "is-active" : ""}`}
              onClick={closeMenu}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            to={isAuthenticated ? "/admin" : "/giris"}
            className={({ isActive }) => `site-header__link site-header__link--admin ${isActive ? "is-active" : ""}`}
            onClick={closeMenu}
          >
            {isAuthenticated ? "Berber Paneli" : "Admin Girişi"}
          </NavLink>
        </nav>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
          title={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

      </div>
    </header >
  );
}
