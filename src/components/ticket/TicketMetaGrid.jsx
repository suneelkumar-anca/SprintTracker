import AssigneeCard from "../ui/AssigneeCard.jsx";
import { fmtFull } from "../../utils/dateUtils.js";

const META_CELL = (i) => ({
  padding: "16px 20px",
  borderRight: i < 2 ? "1px solid var(--border)" : "none",
});

const LABEL_STYLE = {
  fontSize: 10, color: "var(--text-5)", textTransform: "uppercase",
  letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10,
};

export default function TicketMetaGrid({ ticket }) {
  const cells = [
    { label: "Assignee",
      content: <AssigneeCard name={ticket.assigneeName} avatarUrl={ticket.assigneeAvatar} email={ticket.assigneeEmail} /> },
    { label: "Story Points",
      content: Number.isFinite(ticket.sp) ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: "#3b82f6", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{ticket.sp}</span>
          <span style={{ fontSize: 12, color: "var(--text-4)" }}>pts</span>
        </div>
      ) : <span style={{ fontSize: 14, color: "var(--text-5)" }}>—</span> },
    { label: "Created",
      content: (
        <div>
          <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{fmtFull(ticket.created)}</div>
          {ticket.reporter && <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>by {ticket.reporter}</div>}
          {ticket.updated && ticket.updated !== ticket.created && (
            <div style={{ fontSize: 11, color: "var(--text-5)", marginTop: 4 }}>Updated {fmtFull(ticket.updated)}</div>
          )}
        </div>
      ) },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border)", background: "var(--bg-nav)" }}>
      {cells.map(({ label, content }, i) => (
        <div key={label} style={META_CELL(i)}>
          <div style={LABEL_STYLE}>{label}</div>
          {content}
        </div>
      ))}
    </div>
  );
}
