export default function SavedReportActions({ report, onLoad, onExport, onDelete, onMoveUp, onMoveDown }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
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
      <button onClick={() => onDelete(report.id)} aria-label={`Delete ${report.name}`} title="Delete report" style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "var(--color-error)", display: "flex", alignItems: "center", transition: "all .15s" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.18)"} onMouseLeave={e => e.currentTarget.style.background="rgba(239,68,68,0.08)"}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
    </div>
  );
}
