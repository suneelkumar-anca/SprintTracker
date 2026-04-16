import { useState } from "react";
import { statusCfg } from "../../constants/statusConfig.js";

export default function MilestoneCard({ milestone, index, onLoad, onPublishConfluence, onExport }) {
  const [publishingState, setPublishingState] = useState(null); // "loading", "success", null
  const { name, totalCount, doneCount, totalSP, doneSP, deadlineDate, daysLeft, daysOverdue, statusCounts, completionPct } = milestone;
  const isOverdue = daysOverdue !== null && daysOverdue > 0;

  const statuses = Object.keys(statusCounts).sort((a, b) => statusCounts[b] - statusCounts[a]);
  const statusBars = statuses.map((status) => {
    const count = statusCounts[status];
    const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
    const cfg = statusCfg(status);
    return { status, count, pct, cfg };
  });

  const handleConfluenceClick = async () => {
    setPublishingState("loading");
    try {
      await onPublishConfluence(milestone);
      setPublishingState("success");
      setTimeout(() => setPublishingState(null), 2500);
    } catch (err) {
      console.error("Confluence publish error:", err);
      setPublishingState(null);
    }
  };

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        animation: `slideUp 0.3s ease-out backwards`,
        animationDelay: `${index * 0.05}s`,
        transition: "all 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)" }}>{name}</div>
        <div style={{ fontSize: 12, color: isOverdue ? "var(--color-error)" : "var(--text-3)" }}>
          {deadlineDate ? (
            <>
              Deadline: {deadlineDate}
              {isOverdue && daysOverdue !== null
                ? ` • ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`
                : daysLeft !== null && ` • ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
            </>
          ) : (
            "No deadline"
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {[
          { label: "Tickets", value: `${doneCount}/${totalCount}`, color: "var(--text)" },
          { label: "SP", value: `${doneSP}/${totalSP}`, color: "var(--color-info)" },
          { label: "Done", value: `${completionPct}%`, color: "var(--color-success)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, background: "var(--bg-elevated)", border: "1px solid var(--border-sub)", borderRadius: 8, padding: "10px 12px", minWidth: 0 }}>
            <div style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 6, fontWeight: 600 }}>Status Breakdown</div>
        <div style={{ display: "flex", gap: 2, height: 24, borderRadius: 4, overflow: "hidden", background: "var(--bg-elevated)" }}>
          {statusBars.map(({ status, pct, cfg }) => (
            <div
              key={status}
              title={`${status}: ${((pct / 100) * totalCount).toFixed(0)}/${totalCount}`}
              style={{
                flex: pct > 1 ? pct : 0,
                background: cfg.bg || "var(--color-secondary)",
                minWidth: pct > 2 ? "auto" : 0,
                transition: "flex 0.4s ease-out",
                animation: pct > 0 ? `progressFill 0.8s ease-out` : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
        <button
          onClick={() => onLoad(name)}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-act)",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-hi)",
            cursor: "pointer",
            transition: "all 0.15s",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--border-act)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
          }}
        >
          Load
        </button>
        <button
          onClick={handleConfluenceClick}
          disabled={publishingState === "loading"}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: publishingState === "loading" ? "#1e40af" : publishingState === "success" ? "#22c55e" : "#1e3a8a",
            border: `1px solid ${publishingState === "success" ? "#16a34a" : publishingState === "loading" ? "#1e40af" : "#1e40af"}`,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            cursor: publishingState === "loading" ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            opacity: publishingState === "loading" ? 0.8 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (publishingState !== "loading" && publishingState !== "success") {
              e.currentTarget.style.background = "#1e40af";
            }
          }}
          onMouseLeave={(e) => {
            if (publishingState !== "loading" && publishingState !== "success") {
              e.currentTarget.style.background = "#1e3a8a";
            }
          }}
        >
          {publishingState === "loading" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {publishingState === "success" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "scaleCheck 0.4s ease-out", flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {publishingState === "loading" ? "Publishing..." : publishingState === "success" ? "Published" : "Confluence"}
        </button>
        <button
          onClick={() => onExport(milestone)}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-hi)",
            cursor: "pointer",
            transition: "all 0.15s",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--border)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
          }}
        >
          Export
        </button>
      </div>

      {publishingState === "success" && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          animation: "paperPlane 1s ease-out",
        }}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            <path d="M15 50 L85 15 L50 85 L35 58 Z" fill="#22c55e" opacity="0.9" style={{ filter: "drop-shadow(0 2px 8px rgba(34, 197, 94, 0.4))" }} />
          </svg>
        </div>
      )}
    </div>
  );
}
