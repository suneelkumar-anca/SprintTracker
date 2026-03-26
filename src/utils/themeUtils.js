export const THEME_KEY = "sprint-tracker-theme";

export function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(pref) {
  return pref === "system" ? getSystemTheme() : pref;
}

export function applyTheme(pref) {
  const r = resolveTheme(pref);
  document.documentElement.dataset.theme = r;
  document.documentElement.style.colorScheme = r;
}
