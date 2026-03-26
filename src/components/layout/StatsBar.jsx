import { memo } from "react";

const StatsBar = memo(function StatsBar({ totalTickets, doneCount, totalSP, doneSP, currentSprintName }) {
  if (!totalTickets) return null;
  const stats = [
    { label: "Total Tickets",  value: totalTickets,                   color: "var(--text)" },
    { label: "Completed",      value: `${doneCount}/${totalTickets}`,  color: "var(--color-success)" },
    { label: "Story Points",   value: `${doneSP}/${totalSP} sp`,       color: "var(--color-info)" },
    { label: "Sprint",         value: currentSprintName,               color: "var(--color-accent)" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{value}</div>
        </div>
      ))}
    </div>
  );
});

export default StatsBar;
