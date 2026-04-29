import { memo } from "react";
import AvatarImg from "../ui/AvatarImg.jsx";
import { statusCfg } from "../../constants/statusConfig.js";
import PersonTicketList from "./PersonTicketList.jsx";

const DashboardPersonCard = memo(function DashboardPersonCard({ person, onSelectTicket }) {
  const doneCount = person.tickets.filter(t => (t.status ?? "").toLowerCase() === "done").length;
  const rejectedCount = person.tickets.filter(t => { const s = (t.status ?? "").toLowerCase(); return s === "rejected" || s === "declined"; }).length;
  const completionPct = person.tickets.length > 0 ? Math.round((doneCount / person.tickets.length) * 100) : 0;
  const rejectedPct = person.tickets.length > 0 ? Math.min((rejectedCount / person.tickets.length) * 100, 100 - completionPct) : 0;
  const spPct = person.totalSP > 0 ? Math.round((person.doneSP / person.totalSP) * 100) : 0;
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid #0d1626", display: "flex", alignItems: "center", gap: 12 }}>
        <AvatarImg src={person.avatar} name={person.name} size={40} radius={12} fontSize={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{person.tickets.length} ticket{person.tickets.length !== 1 ? "s" : ""}{person.totalSP > 0 ? ` · ${person.totalSP} SP` : ""}</div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: completionPct === 100 ? "var(--color-success)" : completionPct >= 50 ? "var(--color-warning)" : "var(--color-info)" }}>{completionPct}%</div>
          <div style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>done</div>
        </div>
      </div>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #0d1626", display: "flex", flexDirection: "column", gap: 8 }}>
        {[{ label: "Tickets", done: doneCount, total: person.tickets.length, pct: completionPct, color: "linear-gradient(90deg,#3b82f6,#60a5fa)" },
          ...(person.totalSP > 0 ? [{ label: "Story Points", done: person.doneSP, total: person.totalSP, pct: spPct, color: "linear-gradient(90deg,#818cf8,#a78bfa)" }] : [])
        ].map(({ label, done, total, pct, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-3)" }}>
                {done}/{total}
                {label === "Tickets" && rejectedCount > 0 && <span style={{ color: "#ef4444", marginLeft: 4 }}>· {rejectedCount} rej</span>}
              </span>
            </div>
            <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width .4s", flexShrink: 0 }} />
              {label === "Tickets" && rejectedPct > 0 && (
                <div style={{ width: `${rejectedPct}%`, height: "100%", background: "linear-gradient(90deg,#ef4444,#dc2626)", borderRadius: 3, transition: "width .4s", flexShrink: 0 }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 18px", borderBottom: "1px solid #0d1626", display: "flex", gap: 5, flexWrap: "wrap" }}>
        {Object.entries(person.statusCounts).sort((a,b) => b[1]-a[1]).map(([status, count]) => {
          const cfg = statusCfg(status);
          return <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />{status} · {count}
          </span>;
        })}
      </div>
      <PersonTicketList tickets={person.tickets} onSelectTicket={onSelectTicket} />
    </div>
  );
});

export default DashboardPersonCard;
