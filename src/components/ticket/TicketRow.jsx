import { useState, memo } from "react";
import AvatarImg from "../ui/AvatarImg.jsx";
import { statusCfg } from "../../constants/statusConfig.js";

const TicketRow = memo(function TicketRow({ ticket, onSelect, isActive }) {
  const [hov, setHov] = useState(false);
  const cfg = statusCfg(ticket.status);
  return (
    <div role="button" tabIndex={0} aria-label={`Load ticket ${ticket.id}: ${ticket.description}`}
      aria-pressed={isActive} onClick={() => onSelect(ticket.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(ticket.id)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: "9px 14px 8px 12px", cursor: "pointer",
        background: isActive ? "rgba(59,130,246,0.07)" : hov ? "var(--bg-card)" : "transparent",
        borderBottom: "1px solid #0d1626",
        borderLeft: `3px solid ${isActive ? "#3b82f6" : cfg.color + "60"}`,
        transition: "background .12s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--color-info)", fontWeight: 700, flexShrink: 0 }}>{ticket.id}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, textTransform: "uppercase", letterSpacing: "0.04em",
          flexShrink: 0, maxWidth: 94, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ticket.status}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />{ticket.status ?? "Unknown"}
        </span>
        <AvatarImg src={ticket.assigneeAvatar} name={ticket.assigneeName} size={22} radius={6} fontSize={9} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700,
          color: Number.isFinite(ticket.sp) ? "var(--color-sp)" : "var(--border-act)",
          background: Number.isFinite(ticket.sp) ? "rgba(167,139,250,0.12)" : "transparent",
          border: `1px solid ${Number.isFinite(ticket.sp) ? "rgba(167,139,250,0.25)" : "var(--border)"}`,
          padding: "2px 5px", borderRadius: 4, minWidth: 22, textAlign: "center", flexShrink: 0 }} title="Story Points">
          {Number.isFinite(ticket.sp) ? ticket.sp : "—"}
        </span>
      </div>
      <div style={{ fontSize: 12, color: isActive ? "var(--text-mid)" : "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 2 }}>
        {ticket.description || <span style={{ fontStyle: "italic", color: "var(--text-5)" }}>No summary</span>}
      </div>
    </div>
  );
});

export default TicketRow;
