const INPUT_STYLE = {
  background: "transparent", border: "none", outline: "none",
  color: "var(--text-2)", fontSize: 11, fontFamily: "Inter, sans-serif",
  width: "100%", cursor: "pointer",
};

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...INPUT_STYLE, background: "var(--bg)", border: "1px solid var(--border-sub)", borderRadius: 6, padding: "5px 8px", color: value ? "#60a5fa" : "var(--text-3)" }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function SprintPanelFilters({
  filterAssignee, setFilterAssignee, uniqueAssignees,
  filterStatus,   setFilterStatus,   uniqueStatuses,
  filterStart,    setFilterStart,
  filterEnd,      setFilterEnd,
  hasActiveFilters, clearFilters,
}) {
  return (
    <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ flex: 1 }}>
          <FilterSelect value={filterAssignee} onChange={setFilterAssignee} placeholder="Assignee" options={uniqueAssignees} />
        </div>
        <div style={{ flex: 1 }}>
          <FilterSelect value={filterStatus} onChange={setFilterStatus} placeholder="Status" options={uniqueStatuses} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
          aria-label="Filter start date"
          style={{ ...INPUT_STYLE, flex: 1, background: "var(--bg)", border: "1px solid var(--border-sub)", borderRadius: 6, padding: "5px 8px" }} />
        <span style={{ fontSize: 10, color: "var(--text-4)", flexShrink: 0 }} aria-hidden="true">–</span>
        <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
          aria-label="Filter end date"
          style={{ ...INPUT_STYLE, flex: 1, background: "var(--bg)", border: "1px solid var(--border-sub)", borderRadius: 6, padding: "5px 8px" }} />
        {hasActiveFilters && (
            <button onClick={clearFilters} title="Clear filters" aria-label="Clear all filters"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 5, padding: "4px 7px", cursor: "pointer", color: "#ef4444", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
            ✕ Clear
          </button>
        )}
      </div>
    </div>
  );
}
