import { memo } from "react";
import { resolveTheme } from "../../utils/themeUtils.js";
import { VIEWS, THEMES, LOGO_SVG } from "./headerConfig.jsx";

const AppHeader = memo(function AppHeader({ activeView, setActiveView, themePref, setThemePref, configured, savedCount }) {
  const isDark = resolveTheme(themePref) === "dark";
  const views = VIEWS.map(v => v.id === "saved" && savedCount > 0 ? { ...v, label: `Saved (${savedCount})` } : v);
  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-nav)", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px rgba(99,102,241,0.35), 0 4px 12px rgba(59,130,246,0.3)", flexShrink: 0 }}>{LOGO_SVG}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", letterSpacing: "-0.2px" }}>Sprint Tracker</span>
            <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "'JetBrains Mono',monospace" }}>Jira Report Reviewer</span>
          </div>
          <span style={{ fontSize: 9, color: "var(--text-3)", background: "var(--bg-elevated)", border: "1px solid var(--border-sub)", borderRadius: 4, padding: "2px 6px", fontFamily: "'JetBrains Mono',monospace", marginLeft: 2 }}>v1.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: configured ? "#22c55e" : "var(--text-2)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: configured ? "#22c55e" : "var(--border-act)", boxShadow: configured ? "0 0 6px #22c55e80" : "none" }} />
            {configured ? "Jira connected" : "Jira not configured"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 1, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
            {THEMES.map(({ id, title, icon }) => (
              <button key={id} onClick={() => setThemePref(id)} title={title} aria-label={title} aria-pressed={themePref === id}
                style={{ padding: "4px 8px", borderRadius: 5, border: "none", cursor: "pointer",
                  background: themePref === id ? (isDark ? "var(--border-sub)" : "#d1dce8") : "transparent",
                  color: themePref === id ? "var(--text-hi)" : "var(--text-4)", transition: "all .15s" }}>{icon}</button>
            ))}
          </div>
          <nav aria-label="Main navigation" style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
            {views.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveView(id)}
                aria-current={activeView === id ? "page" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
                  background: activeView === id ? "var(--bg-elevated)" : "transparent",
                  color: activeView === id ? "var(--text-hi)" : "var(--text-4)",
                  boxShadow: activeView === id ? "0 1px 4px rgba(0,0,0,0.4)" : "none", transition: "all .15s" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon}/></svg>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
});

export default AppHeader;
