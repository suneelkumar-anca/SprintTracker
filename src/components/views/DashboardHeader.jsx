export default function DashboardHeader({ sprintName, stats, sprint }) {
  const { people, totalTickets, doneCount, totalSP, progressPct, daysLeft, daysOverdue, sprintStart, sprintEnd, sprintState } = stats;
  const doneSP = stats.doneSP ?? 0;
  const stateColor = sprintState === "active" ? "var(--color-success)" : sprintState === "future" ? "var(--color-info)" : "var(--text-3)";

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-hi)", margin: 0, letterSpacing: "-0.4px" }}>Team Contributions</h2>
            {sprintState && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${stateColor}18`, color: stateColor, border: `1px solid ${stateColor}30`, textTransform: "uppercase", letterSpacing: "0.06em" }}>{sprintState}</span>}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-4)", margin: "0 0 10px" }}>
            {sprintName} &nbsp;·&nbsp; {people.length} contributors &nbsp;·&nbsp; {totalTickets} tickets &nbsp;·&nbsp; {doneCount} done
          </p>
          {(sprintStart || sprintEnd) && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {sprintStart && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 11, color: "var(--text-3)" }}>Start</span><span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "'JetBrains Mono',monospace" }}>{sprintStart}</span></div>}
              {sprintEnd   && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 11, color: "var(--text-3)" }}>End</span><span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "'JetBrains Mono',monospace" }}>{sprintEnd}</span></div>}
              {daysOverdue != null && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-error)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 5, padding: "2px 7px" }}>{daysOverdue}d overdue</span>}
              {daysLeft != null && daysOverdue == null && <span style={{ fontSize: 11, fontWeight: 600, color: daysLeft <= 2 ? "var(--color-warning)" : "var(--color-success)", background: daysLeft <= 2 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${daysLeft <= 2 ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.15)"}`, borderRadius: 5, padding: "2px 7px" }}>{daysLeft}d remaining</span>}
            </div>
          )}
          {sprint?.startDate && sprint?.endDate && (
            <div style={{ marginTop: 10, width: 320 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>Time elapsed</span>
                <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-4)" }}>{progressPct}%</span>
              </div>
              <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 3, background: daysOverdue ? "#ef4444" : "linear-gradient(90deg,#3b82f6,#818cf8)", transition: "width .4s" }} />
              </div>
            </div>
          )}
        </div>
        {totalSP > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>Sprint SP</span>
            <div style={{ width: 160, height: 8, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (doneSP / totalSP) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#3b82f6,#818cf8)", borderRadius: 4, transition: "width .4s" }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--color-accent)" }}>{doneSP}/{totalSP} sp</span>
          </div>
        )}
      </div>
    </div>
  );
}
