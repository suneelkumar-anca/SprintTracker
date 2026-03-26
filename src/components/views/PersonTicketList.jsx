import { statusCfg } from "../../constants/statusConfig.js";

export default function PersonTicketList({ tickets, onSelectTicket }) {
  return (
    <div style={{ maxHeight: 200, overflowY: "auto" }}>
      {tickets.map((t) => {
        const cfg = statusCfg(t.status);
        return <div key={t.id} role="button" tabIndex={0} aria-label={`Load ${t.id}`} onClick={() => onSelectTicket(t.id)} onKeyDown={e => (e.key === "Enter" || e.key === " ") && onSelectTicket(t.id)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 18px", borderBottom: "1px solid #080e1b", cursor: "pointer", transition: "background .1s" }}
          onMouseEnter={e => e.currentTarget.style.background="var(--bg-card)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--color-info)", fontWeight: 700, flexShrink: 0, minWidth: 70 }}>{t.id}</span>
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description || "No summary"}</span>
          <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, textTransform: "uppercase", flexShrink: 0, maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.status ?? "?"}</span>
          {Number.isFinite(t.sp) && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "var(--color-sp)", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", padding: "1px 5px", borderRadius: 3, flexShrink: 0 }}>{t.sp}</span>}
        </div>;
      })}
    </div>
  );
}
