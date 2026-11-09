"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./admin.module.css";

export type AdminTheme = "light" | "dark" | "system";

const STORAGE_KEY = "ns_admin_theme_v1";

function getThemeSnapshot(): AdminTheme {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") return val;
  } catch {
    // fallback
  }
  return "light";
}

function getServerThemeSnapshot(): AdminTheme {
  return "light";
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    mql.removeEventListener("change", callback);
  };
}

function applyThemeToDOM(pref: AdminTheme) {
  if (typeof window === "undefined") return;
  const isDark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const active = isDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", active);
  if (active === "dark") {
    document.documentElement.classList.add("admin-dark");
  } else {
    document.documentElement.classList.remove("admin-dark");
  }
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const emptySubscribe = () => () => {};

export function ThemeSwitch() {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const preference = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync DOM with preference
  useEffect(() => {
    applyThemeToDOM(preference);
  }, [preference]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectTheme = (theme: AdminTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    applyThemeToDOM(theme);
    window.dispatchEvent(new Event("storage"));
    setIsOpen(false);
  };

  const isDarkActive =
    isMounted &&
    (preference === "dark" ||
      (preference === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches));

  return (
    <div className={styles.themeSwitchContainer} ref={menuRef}>
      <button
        type="button"
        className={styles.themeSwitchTrigger}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={`Theme: ${preference} (${isDarkActive ? "Dark" : "Light"})`}
      >
        {isDarkActive ? (
          <MoonIcon className={styles.themeSwitchIcon} />
        ) : (
          <SunIcon className={styles.themeSwitchIcon} />
        )}
        <span className={styles.themeSwitchCurrentLabel}>
          {preference === "system" ? "Auto" : preference === "dark" ? "Dark" : "Light"}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.6 }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.themeDropdownMenu} role="menu" aria-label="Theme selection">
          <div className={styles.themeDropdownHeader}>Appearance</div>
          <button
            type="button"
            role="menuitem"
            className={`${styles.themeDropdownItem} ${preference === "light" ? styles.themeDropdownItemActive : ""}`}
            onClick={() => selectTheme("light")}
          >
            <SunIcon className={styles.themeMenuItemIcon} />
            <span className={styles.themeMenuItemText}>Light</span>
            {preference === "light" && <CheckIcon className={styles.themeMenuItemCheck} />}
          </button>

          <button
            type="button"
            role="menuitem"
            className={`${styles.themeDropdownItem} ${preference === "dark" ? styles.themeDropdownItemActive : ""}`}
            onClick={() => selectTheme("dark")}
          >
            <MoonIcon className={styles.themeMenuItemIcon} />
            <span className={styles.themeMenuItemText}>Dark</span>
            {preference === "dark" && <CheckIcon className={styles.themeMenuItemCheck} />}
          </button>

          <button
            type="button"
            role="menuitem"
            className={`${styles.themeDropdownItem} ${preference === "system" ? styles.themeDropdownItemActive : ""}`}
            onClick={() => selectTheme("system")}
          >
            <MonitorIcon className={styles.themeMenuItemIcon} />
            <span className={styles.themeMenuItemText}>System</span>
            {preference === "system" && <CheckIcon className={styles.themeMenuItemCheck} />}
          </button>
        </div>
      )}
    </div>
  );
}
