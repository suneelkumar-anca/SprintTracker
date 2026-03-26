export default function TicketSearchInput({ query, setQuery, lookup, clearAll, loading, error, configured }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-hi)", margin: "0 0 4px", letterSpacing: "-0.4px" }}>Ticket Lookup</h2>
      <p style={{ fontSize: 13, color: "var(--text-4)", margin: "0 0 16px" }}>Enter a Jira ticket ID to load its full details, review rating &amp; linked PRs.</p>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 16px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="ticket-lookup" aria-label="Jira ticket ID" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && lookup()} placeholder="TR-38275" disabled={!configured}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-hi)", fontSize: 14, fontFamily: "'JetBrains Mono',monospace", padding: "14px 0", letterSpacing: "0.03em", cursor: configured ? "text" : "not-allowed" }} />
          {query && <button onClick={clearAll} aria-label="Clear" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-5)", fontSize: 16, lineHeight: 1, padding: 2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>}
        </div>
        <button onClick={() => lookup()} disabled={loading || !configured}
          style={{ padding: "0 26px", background: loading ? "var(--border-sub)" : "#3b82f6", border: "none", borderRadius: 12, color: loading ? "var(--text-4)" : "#fff", fontSize: 14, fontWeight: 600, cursor: (loading || !configured) ? "not-allowed" : "pointer", transition: "background .15s", whiteSpace: "nowrap", fontFamily: "Inter,sans-serif" }}
          onMouseEnter={e => { if (!loading && configured) e.currentTarget.style.background="#2563eb"; }}
          onMouseLeave={e => { if (!loading && configured) e.currentTarget.style.background="#3b82f6"; }}>
          {loading ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.7s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Loading</span> : "Fetch →"}
        </button>
      </div>
      {error && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#ef4444", display: "flex", alignItems: "center", gap: 7, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, padding: "10px 14px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}
    </div>
  );
}
