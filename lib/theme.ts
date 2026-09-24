export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "hackvillage-theme";
export const THEME_CHANGE_EVENT = "hackvillage-theme-change";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

// Runs in <head> before the page paints to avoid a light flash on dark devices.
// No user-provided text is interpolated into this script.
export const THEME_INIT_SCRIPT = `(() => {
  let preference = 'system';
  try {
    const saved = localStorage.getItem('hackvillage-theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {}
  const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();`;
