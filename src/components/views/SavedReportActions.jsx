import { useState } from "react";

const docIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
    <polyline points="13 2 13 9 20 9"/>
  </svg>
);
const spinIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const checkIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "scaleCheck 0.4s ease-out" }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function ConfluenceButton({ label, onPublish, report, ariaLabel }) {
  const [state, setState] = useState(null); // "loading" | "success" | null

  const handle = async () => {
    setState("loading");
    try {
      const result = await onPublish(report);
      setState("success");
      // Open page after animation completes (~1s)
      if (result?.pageUrl) {
        setTimeout(() => window.open(result.pageUrl, "_blank"), 1000);
      }
      setTimeout(() => setState(null), 2500);
    } catch (err) {
      console.error("Confluence publish error:", err);
      setState(null);
    }
  };

  const isLoading = state === "loading";
  const isSuccess = state === "success";

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={handle}
        disabled={isLoading}
        aria-label={ariaLabel}
        title={ariaLabel}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          cursor: isLoading ? "not-allowed" : "pointer",
          fontWeight: 600,
          fontSize: 12,
          border: `1px solid ${isSuccess ? "rgba(34,197,94,0.3)" : isLoading ? "rgba(88,166,255,0.5)" : "rgba(88,166,255,0.3)"}`,
          background: isSuccess ? "rgba(34,197,94,0.18)" : isLoading ? "rgba(88,166,255,0.18)" : "rgba(88,166,255,0.08)",
          color: isSuccess ? "var(--color-success)" : "var(--color-primary)",
          fontFamily: "Inter,sans-serif",
          transition: "all .15s",
          display: "flex",
          alignItems: "center",
          gap: 5,
          opacity: isLoading ? 0.8 : 1,
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { if (!isLoading && !isSuccess) e.currentTarget.style.background = "rgba(88,166,255,0.18)"; }}
        onMouseLeave={e => { if (!isLoading && !isSuccess) e.currentTarget.style.background = "rgba(88,166,255,0.08)"; }}
      >
        {isLoading ? spinIcon : isSuccess ? checkIcon : docIcon}
        {isLoading ? "Publishing…" : isSuccess ? "Published" : label}
      </button>
      {isSuccess && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          animation: "paperPlane 1s ease-out",
          zIndex: 50,
        }}>
          <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
            <path d="M15 50 L85 15 L50 85 L35 58 Z" fill="#22c55e" opacity="0.9" style={{ filter: "drop-shadow(0 2px 8px rgba(34,197,94,0.4))" }} />
          </svg>
        </div>
      )}
    </div>
  );
}

export default function SavedReportActions({ report, onLoad, onExport, onDelete, onPublishReport, onPublishRetro, onMoveUp, onMoveDown }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 2, position: "relative", flexWrap: "wrap" }}>
      {(onMoveUp || onMoveDown) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <button onClick={onMoveUp} disabled={!onMoveUp} aria-label={`Move ${report.name} up`}
            style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid var(--border-sub)", background: "transparent", color: onMoveUp ? "var(--text-3)" : "var(--border)", cursor: onMoveUp ? "pointer" : "default", fontSize: 9, lineHeight: 1 }}>▲</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} aria-label={`Move ${report.name} down`}
            style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid var(--border-sub)", background: "transparent", color: onMoveDown ? "var(--text-3)" : "var(--border)", cursor: onMoveDown ? "pointer" : "default", fontSize: 9, lineHeight: 1 }}>▼</button>
        </div>
      )}
      <button onClick={() => onLoad(report)} aria-label={`Load ${report.name}`} style={{ flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.08)", color: "var(--color-info)", fontFamily: "Inter,sans-serif", transition: "all .15s" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(59,130,246,0.18)"} onMouseLeave={e => e.currentTarget.style.background="rgba(59,130,246,0.08)"}>Load Report</button>
      <button onClick={() => onExport(report)} aria-label={`Export ${report.name} to Excel`} title="Export to Excel" style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "var(--color-success)", fontFamily: "Inter,sans-serif", transition: "all .15s", display: "flex", alignItems: "center", gap: 5 }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(34,197,94,0.18)"} onMouseLeave={e => e.currentTarget.style.background="rgba(34,197,94,0.08)"}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Excel</button>
      {onPublishReport && (
        <ConfluenceButton
          label="Report"
          onPublish={onPublishReport}
          report={report}
          ariaLabel={`Publish ${report.name} sprint report to Confluence`}
        />
      )}
      {onPublishRetro && (
        <ConfluenceButton
          label="Retro"
          onPublish={onPublishRetro}
          report={report}
          ariaLabel={`Publish ${report.name} retrospective to Confluence`}
        />
      )}
      <button onClick={() => onDelete(report.id)} aria-label={`Delete ${report.name}`} title="Delete report" style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "var(--color-error)", display: "flex", alignItems: "center", transition: "all .15s" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.18)"} onMouseLeave={e => e.currentTarget.style.background="rgba(239,68,68,0.08)"}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
    </div>
  );
}
