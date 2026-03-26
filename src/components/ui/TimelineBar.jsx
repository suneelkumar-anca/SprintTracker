import { fmt, relativeDuration } from "../../utils/dateUtils.js";

export default function TimelineBar({ startDate, endDate }) {
  const now = new Date();
  const s = new Date(startDate);
  const e = new Date(endDate);
  const total = e - s;
  const progPct = total > 0 ? Math.min(100, Math.max(0, ((now - s) / total) * 100)) : 0;
  const days = relativeDuration(startDate, endDate);
  const overdue = now > e;

  return (
    <div>
      <div style={{ position: "relative", height: 8, background: "var(--bg-elevated)", borderRadius: 4, overflow: "visible" }}>
        <div style={{
          position: "absolute", left: 0, width: `${progPct}%`, height: "100%",
          background: overdue ? "linear-gradient(90deg,#ef4444,#f87171)" : "linear-gradient(90deg,#3b82f6,#818cf8)",
          borderRadius: 4, transition: "width .8s ease",
        }} />
        {progPct > 0 && progPct < 100 && (
          <div style={{
            position: "absolute", left: `${progPct}%`, top: -4, width: 2, height: 16,
            background: "#f59e0b", borderRadius: 1, transform: "translateX(-50%)",
          }} />
        )}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 8,
        fontSize: 11, color: "var(--text-4)", fontFamily: "'JetBrains Mono',monospace",
      }}>
        <span>{fmt(startDate)}</span>
        <span style={{ color: overdue ? "#ef4444" : "var(--text-3)" }}>
          {days}{overdue ? "  overdue" : ""}
        </span>
        <span>{fmt(endDate)}</span>
      </div>
    </div>
  );
}
