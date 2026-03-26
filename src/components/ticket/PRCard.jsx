import { useState } from "react";
import { prStatusCfg } from "../../constants/prStatusConfig.js";

export default function PRCard({ pr }) {
  const cfg = prStatusCfg(pr.status);
  const [hov, setHov] = useState(false);
  return (
    <a href={pr.url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: hov ? "var(--bg-raised)" : "var(--bg-surface)",
        border: "1px solid var(--border-sub)", borderRadius: 10,
        padding: "12px 16px", cursor: "pointer", textDecoration: "none",
        transition: "background .15s", gap: 12,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
          <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <path d="M6 9v6"/><path d="M15.7 6.6A9 9 0 019 9v5.4"/>
        </svg>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "'JetBrains Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pr.name || pr.id}
          </div>
          {(pr.author || pr.repo) && (
            <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
              {[pr.author, pr.repo].filter(Boolean).join("  ")}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
          padding: "2px 8px", borderRadius: 5, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="2">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </div>
    </a>
  );
}
