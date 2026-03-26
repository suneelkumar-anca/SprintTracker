import { useState, useEffect } from "react";
import { THEME_KEY, applyTheme, resolveTheme } from "../utils/themeUtils.js";

export function useThemePref() {
  const [pref, setPrefRaw] = useState(() => localStorage.getItem(THEME_KEY) ?? "dark");

  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [pref]);

  const setPref = (t) => { localStorage.setItem(THEME_KEY, t); setPrefRaw(t); };
  return [pref, setPref];
}
