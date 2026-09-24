"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  applyTheme,
  isThemePreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

function getPreference(): ThemePreference {
  const preference = document.documentElement.dataset.themePreference;
  return isThemePreference(preference) ? preference : "system";
}

export function ThemeSwitcher() {
  const preference = useSyncExternalStore(subscribe, getPreference, () => "system");
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) {
        ref.current?.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function selectTheme(value: ThemePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      /* Still works for this tab when storage is blocked. */
    }
    applyTheme(value);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    ref.current?.removeAttribute("open");
    ref.current?.querySelector("summary")?.focus();
  }

  return (
    <details
      ref={ref}
      className="theme-switcher"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          ref.current?.removeAttribute("open");
          ref.current?.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="header-icon" aria-label="Theme settings" title="Change theme">
        <Sun aria-hidden className="theme-icon-light size-4" />
        <Moon aria-hidden className="theme-icon-dark size-4" />
      </summary>
      <div className="theme-options" role="group" aria-label="Color theme">
        {(
          [
            { value: "light", label: "Light", icon: Sun },
            { value: "dark", label: "Dark", icon: Moon },
            { value: "system", label: "System", icon: Monitor },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={preference === value}
            onClick={() => selectTheme(value)}
          >
            <Icon aria-hidden size={16} />
            <span>{label}</span>
            {preference === value && <Check aria-hidden size={15} />}
          </button>
        ))}
      </div>
    </details>
  );
}
