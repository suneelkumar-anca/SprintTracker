import { useState, useMemo } from "react";
import { useMilestones } from "../../hooks/useMilestones.js";
import { useMilestoneActions } from "../../hooks/useMilestoneActions.js";
import MilestoneCard from "./MilestoneCard.jsx";

export default function MilestonesView({ sprintTickets = [], sprintLoading }) {
  const { allMilestones } = useMilestones(sprintTickets);
  const { publishMilestone, exportMilestone } = useMilestoneActions();
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  const filteredMilestones = useMemo(() => {
    return allMilestones.filter((m) => {
      if (dateFromFilter && m.deadlineDate && m.deadlineDate < dateFromFilter) return false;
      if (dateToFilter && m.deadlineDate && m.deadlineDate > dateToFilter) return false;
      return true;
    });
  }, [allMilestones, dateFromFilter, dateToFilter]);

  if (sprintLoading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 16px", display: "block" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        <p style={{ fontSize: 13, color: "var(--text-4)", margin: 0 }}>Loading milestones…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-hi)", margin: "0 0 16px 0" }}>Milestones</h2>
        <p style={{ fontSize: 13, color: "var(--text-4)", margin: 0 }}>Track progress across labeled milestones. {filteredMilestones.length > 0 ? `${filteredMilestones.length} milestone${filteredMilestones.length !== 1 ? "s" : ""} found.` : "No milestones with tickets."}</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Deadline From</label>
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg-surface)",
              color: "var(--text)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Deadline To</label>
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg-surface)",
              color: "var(--text)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
        </div>
        {(dateFromFilter || dateToFilter) && (
          <button
            onClick={() => {
              setDateFromFilter("");
              setDateToFilter("");
            }}
            style={{
              alignSelf: "flex-end",
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg-elevated)",
              color: "var(--text-hi)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--border)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-elevated)";
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {filteredMilestones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--bg-surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="1.5"><path d="M9 11H7.82a4 4 0 0 0-3.454 6.14l2.534 3.802a2 2 0 0 0 3.294 0l2.534-3.802A4 4 0 0 0 9 11zM15 11h1.18a4 4 0 0 1 3.454 6.14l-2.534 3.802a2 2 0 0 1-3.294 0l-2.534-3.802A4 4 0 0 1 15 11z"/></svg>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-4)", margin: 0 }}>No milestones found. Load a sprint to see labeled milestones.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18, animation: "fadeIn 0.3s ease-out" }}>
          {filteredMilestones.map((milestone, idx) => (
            <MilestoneCard
              key={milestone.name}
              milestone={milestone}
              index={idx}
              onLoad={(name) => console.log("Load milestone:", name)}
              onPublishConfluence={(m) => publishMilestone(m)}
              onExport={(m) => exportMilestone(m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
