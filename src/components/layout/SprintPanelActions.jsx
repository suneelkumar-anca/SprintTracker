export default function SprintPanelActions({ onRefresh, boardsLoading, sprintLoaded, ticketCount, onSave, isAlreadySaved, saveFeedback, filteredCount, onExport }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={onRefresh} disabled={boardsLoading}
        title="Refresh board list" aria-label="Refresh board list"
        style={{ background: "transparent", border: "1px solid var(--border-sub)", borderRadius: 6, padding: "4px 7px", cursor: boardsLoading ? "wait" : "pointer", color: "var(--text-4)", fontSize: 11, lineHeight: 1, transition: "border-color .15s, color .15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor="#3b82f6"; e.currentTarget.style.color="#3b82f6"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-sub)"; e.currentTarget.style.color="var(--text-4)"; }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: "block", animation: boardsLoading ? "spin 0.8s linear infinite" : "none" }}>
          <path d="M3 12a9 9 0 019-9 9 9 0 016.36 2.64L21 9M21 3v6h-6"/><path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.36-2.64L3 15M3 21v-6h6"/>
        </svg>
      </button>
      {sprintLoaded && ticketCount > 0 && (
        <button onClick={onSave}
          title={isAlreadySaved ? "Update saved snapshot" : "Save current sprint report"}
          aria-label={isAlreadySaved ? "Update saved sprint snapshot" : "Save current sprint report"}
          style={{ background: saveFeedback ? "rgba(34,197,94,0.12)" : isAlreadySaved ? "rgba(129,140,248,0.08)" : "transparent",
            border: "1px solid " + (saveFeedback ? "var(--color-success)" : isAlreadySaved ? "rgba(129,140,248,0.5)" : "var(--border-sub)"),
            borderRadius: 6, padding: "4px 8px", cursor: "pointer",
            color: saveFeedback ? "var(--color-success)" : isAlreadySaved ? "var(--color-accent)" : "var(--text-4)", fontSize: 11, fontWeight: 600, transition: "all .2s" }}
          onMouseEnter={e => { if (!saveFeedback) { e.currentTarget.style.borderColor = isAlreadySaved ? "var(--color-accent)" : "var(--color-info)"; e.currentTarget.style.color = isAlreadySaved ? "var(--color-accent)" : "var(--color-info)"; }}}
          onMouseLeave={e => { if (!saveFeedback) { e.currentTarget.style.borderColor = isAlreadySaved ? "rgba(129,140,248,0.5)" : "var(--border-sub)"; e.currentTarget.style.color = isAlreadySaved ? "var(--color-accent)" : "var(--text-4)"; }}}>
          {saveFeedback ? "✓ " + (saveFeedback === "updated" ? "Updated" : "Saved") : isAlreadySaved ? "↑ Update" : "↓ Save"}
        </button>
      )}
      {sprintLoaded && filteredCount > 0 && (
        <button onClick={onExport} title="Export to Excel" aria-label="Export sprint tickets to Excel"
          style={{ background: "transparent", border: "1px solid var(--border-sub)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--text-4)", fontSize: 11, fontWeight: 600, transition: "border-color .15s, color .15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="var(--color-success)"; e.currentTarget.style.color="var(--color-success)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-sub)"; e.currentTarget.style.color="var(--text-4)"; }}>
          ↓ Excel
        </button>
      )}
    </div>
  );
}
