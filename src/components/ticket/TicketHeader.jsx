import { useState } from "react";
import StatusBadge from "../ui/StatusBadge.jsx";
import Pill from "../ui/Pill.jsx";

export default function TicketHeader({ ticket }) {
  const [descExpanded, setDescExpanded] = useState(false);
  return (
    <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {ticket.issueTypeIcon && (
          <img src={ticket.issueTypeIcon} alt={ticket.issueType} width={16} height={16}
            referrerPolicy="no-referrer" style={{ borderRadius: 3, opacity: 0.8 }} />
        )}
        {ticket.issueType && <Pill color="var(--text-2)" bg="rgba(148,163,184,0.08)">{ticket.issueType}</Pill>}
        <a href={ticket.jiraUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--color-info)", fontWeight: 600, textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--color-info)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--color-info)"}>
          {ticket.id}
        </a>
        <span style={{ color: "var(--border)" }}>•</span>
        <StatusBadge status={ticket.status} />
        {ticket.sprintName && (
          <><span style={{ color: "var(--border)" }}>•</span>
          <span style={{ fontSize: 11, color: "var(--text-4)", background: "var(--bg-elevated)", border: "1px solid var(--border-sub)", borderRadius: 5, padding: "2px 8px" }}>{ticket.sprintName}</span></>
        )}
        {ticket.priority && <Pill color="#f59e0b" bg="rgba(245,158,11,0.1)">{ticket.priority}</Pill>}
      </div>
      <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--text-hi)", lineHeight: 1.4, margin: 0, letterSpacing: "-0.4px" }}>{ticket.description}</h2>
      {ticket.descriptionBody && (
        <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
          {descExpanded ? ticket.descriptionBody : ticket.descriptionBody.slice(0, 300)}
          {ticket.descriptionBody.length > 300 && (
            <button onClick={() => setDescExpanded(v => !v)} style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-info)", fontSize: 12, fontWeight: 600, padding: 0 }}>
              {descExpanded ? "Show less" : "▼ Show more"}
            </button>
          )}
        </p>
      )}
      {(ticket.labels?.length > 0 || ticket.components?.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {ticket.labels.map(l => <Pill key={l} color="var(--color-accent)" bg="rgba(129,140,248,0.08)">{l}</Pill>)}
          {ticket.components.map(c => <Pill key={c} color="var(--color-teal)" bg="rgba(52,211,153,0.08)">{c}</Pill>)}
        </div>
      )}
    </div>
  );
}
