"use client";

import { useEffect } from "react";
import { applyTheme, isThemePreference, THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from "@/lib/theme";

/** Keeps the device preference and changes from other tabs in sync on every route. */
export function ThemeController() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const preference = document.documentElement.dataset.themePreference;
      applyTheme(isThemePreference(preference) ? preference : "system");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      applyTheme(isThemePreference(event.newValue) ? event.newValue : "system");
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
