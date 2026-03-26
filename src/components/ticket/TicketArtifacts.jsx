import Pill from "../ui/Pill.jsx";
import Skeleton from "../ui/Skeleton.jsx";

export default function TicketArtifacts({ prs, prsLoading, ticket }) {
  const merged = prs.filter(p => p.status === "MERGED").length;
  const open   = prs.filter(p => p.status === "OPEN").length;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {prsLoading ? <Skeleton w={100} h={32} radius={8} /> : (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: prs.length > 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${prs.length > 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
          borderRadius: 8, padding: "7px 13px",
          color: prs.length > 0 ? "var(--color-success)" : "var(--color-error)",
          fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
        }}>
          {prs.length > 0 ? (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>{prs.length} PR{prs.length > 1 ? "s" : ""} linked</>
          ) : (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>No PR</>
          )}
        </span>
      )}
      {!prsLoading && prs.length > 0 && (
        <>
          {merged > 0 && <Pill color="var(--color-accent)" bg="rgba(129,140,248,0.08)">{merged} merged</Pill>}
          {open   > 0 && <Pill color="var(--color-info)" bg="rgba(59,130,246,0.08)">{open} open</Pill>}
        </>
      )}
      {ticket.artifacts && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 8, padding: "7px 13px", color: "var(--color-accent)", fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/>
          </svg>
          {ticket.artifacts}
        </span>
      )}
    </div>
  );
}
