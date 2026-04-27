import { useState } from "react";
import { useBoardLabels } from "../../hooks/useBoardLabels.js";
import { useLabelMilestoneActions } from "../../hooks/useLabelMilestoneActions.js";
import { calculateLabelStats, formatDateShort } from "../../services/jira/calculateLabelStats.js";
import BoardSelector from "./BoardSelector.jsx";
import LabelsGrid from "./LabelsGrid.jsx";

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
    {children}
  </div>
);

const inputBase = {
  padding: "9px 12px",
  borderRadius: 7,
  border: "1px solid var(--border-sub)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
  transition: "border-color 0.15s",
  outline: "none",
};

export default function MilestonesView() {
  const { publishMilestoneFromLabels, exportMilestoneFromLabels, loading: labelActionLoading } = useLabelMilestoneActions();
  const { boards: teamBoards, selectedBoardId, setSelectedBoardId, labels, selectedLabels, toggleLabel, issues, loading: boardLabelsLoading, error: boardLabelsError } = useBoardLabels("10108");

  const [viewMode, setViewMode] = useState("grid");
  const [searchTeam, setSearchTeam] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredBoards = teamBoards.filter(b =>
    b.name.toLowerCase().includes(searchTeam.toLowerCase())
  );

  const dateFilteredIssues = issues.filter((issue) => {
    const created = issue.created;
    if (!created) return true;
    if (fromDate && created < fromDate) return false;
    if (toDate && created > toDate) return false;
    return true;
  });
  const hasDateFilter = !!(fromDate || toDate);

  if (boardLabelsError) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--bg-error-subtle)", border: "1px solid var(--border-error)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-error)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-error)", margin: 0 }}>{boardLabelsError}</p>
      </div>
    );
  }

  const currentBoard = teamBoards.find(b => b.id === selectedBoardId);
  const activeIssues = dateFilteredIssues;

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-hi)", margin: "0 0 6px 0" }}>Milestones</h2>
        <p style={{ fontSize: 13, color: "var(--text-4)", margin: 0 }}>Select a team board and labels to generate milestone reports.</p>
      </div>

      {/* STEP 1: Search + Board selector */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>1. Select Team Board</SectionLabel>

        {/* Search input */}
        <div style={{ position: "relative", marginBottom: 14, maxWidth: 360 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchTeam}
            onChange={(e) => setSearchTeam(e.target.value)}
            placeholder="Search boards..."
            style={{ ...inputBase, paddingLeft: 34, paddingRight: searchTeam ? 32 : 12 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-sub)")}
          />
          {searchTeam && (
            <button onClick={() => setSearchTeam("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-4)", lineHeight: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        <BoardSelector
          boards={filteredBoards}
          selectedBoardId={selectedBoardId}
          onSelectBoard={setSelectedBoardId}
          loading={boardLabelsLoading}
        />
        {filteredBoards.length > 0 && (
          <p style={{ fontSize: 11, color: "var(--text-4)", margin: "10px 0 0 0" }}>
            {filteredBoards.length} board{filteredBoards.length !== 1 ? "s" : ""} found
            {selectedBoardId && currentBoard && (
              <> &middot; <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{currentBoard.name}</span> selected</>
            )}
          </p>
        )}
      </div>

            {/* STEP 2: Labels */}
      {selectedBoardId ? (
        <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <SectionLabel>2. Select Labels {selectedLabels.length > 0 && <span style={{ color: "#8b5cf6", fontWeight: 700 }}>({selectedLabels.length} selected)</span>}</SectionLabel>
              <div style={{ display: "flex", gap: 2, background: "var(--bg-subtle)", border: "1px solid var(--border-sub)", borderRadius: 8, padding: 3 }}>
                {[
                  { mode: "grid", label: "Grid", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
                  { mode: "list", label: "List", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg> },
                ].map(({ mode, label, icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    title={`${label} view`}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 10px", borderRadius: 5, cursor: "pointer", border: "none", outline: "none",
                      background: viewMode === mode ? "var(--bg)" : "transparent",
                      color: viewMode === mode ? "var(--color-primary)" : "var(--text-4)",
                      fontWeight: viewMode === mode ? 600 : 400,
                      fontSize: 11,
                      boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => { if (viewMode !== mode) e.currentTarget.style.color = "var(--text-2)"; }}
                    onMouseLeave={(e) => { if (viewMode !== mode) e.currentTarget.style.color = "var(--text-4)"; }}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {labels.length > 0 ? (
              <LabelsGrid labels={labels} selectedLabels={selectedLabels} onToggleLabel={toggleLabel} viewMode={viewMode} loading={boardLabelsLoading} />
            ) : (
              <div style={{ padding: "16px 20px", borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border-sub)", color: "var(--text-4)", fontSize: 13, textAlign: "center" }}>
                {boardLabelsLoading ? "Loading labels..." : "No labels found for this board"}
              </div>
            )}
          </div>

          {/* STEP 3: Date Filter + Report Preview */}
          {selectedLabels.length > 0 && issues.length > 0 && (() => {
            const stats = calculateLabelStats(activeIssues);
            const daysRange = (stats.startDate && stats.endDate)
              ? Math.round((new Date(stats.endDate + "T00:00:00Z") - new Date(stats.startDate + "T00:00:00Z")) / 86400000)
              : null;

            return (
              <>
                {/* Date range filter bar */}
                <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 10, background: "var(--bg-subtle)", border: `1px solid ${hasDateFilter ? "var(--color-primary)" : "var(--border-sub)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 12, fontWeight: 600 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Date Range
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 280 }}>
                      <div style={{ flex: 1, minWidth: 130 }}>
                        <input
                          type="date"
                          value={fromDate}
                          max={toDate || undefined}
                          onChange={(e) => setFromDate(e.target.value)}
                          style={{ ...inputBase, padding: "7px 10px", fontSize: 12, borderColor: fromDate ? "var(--color-primary)" : undefined }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = fromDate ? "var(--color-primary)" : "var(--border-sub)")}
                        />
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2" style={{ flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      <div style={{ flex: 1, minWidth: 130 }}>
                        <input
                          type="date"
                          value={toDate}
                          min={fromDate || undefined}
                          onChange={(e) => setToDate(e.target.value)}
                          style={{ ...inputBase, padding: "7px 10px", fontSize: 12, borderColor: toDate ? "var(--color-primary)" : undefined }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = toDate ? "var(--color-primary)" : "var(--border-sub)")}
                        />
                      </div>
                    </div>

                    {hasDateFilter ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--text-4)" }}>
                          <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>{activeIssues.length}</span>
                          {" "}/{" "}{issues.length} issues
                        </span>
                        <button onClick={() => { setFromDate(""); setToDate(""); }}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--text-4)", background: "var(--bg-elevated)", border: "1px solid var(--border-sub)", borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          Clear
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-4)" }}>All {issues.length} issues</span>
                    )}
                  </div>
                </div>

                {/* Report Preview card */}
                <div style={{ borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border-sub)", overflow: "hidden" }}>

                  {/* Card header */}
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-sub)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hi)", marginBottom: 2 }}>Report Preview</div>
                      <div style={{ fontSize: 12, color: "var(--text-4)" }}>
                        {stats.issueCount} issue{stats.issueCount !== 1 ? "s" : ""}
                        {" \u00B7 "}{selectedLabels.length} label{selectedLabels.length !== 1 ? "s" : ""}
                        {hasDateFilter && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 10, background: "rgba(59,130,246,0.12)", color: "var(--color-primary)", fontSize: 10, fontWeight: 700 }}>FILTERED</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => exportMilestoneFromLabels(activeIssues, selectedLabels, currentBoard?.name)}
                        disabled={labelActionLoading || activeIssues.length === 0}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 7, border: "1px solid var(--border-sub)", background: "var(--bg)", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: activeIssues.length === 0 ? "not-allowed" : "pointer", opacity: activeIssues.length === 0 ? 0.5 : 1, transition: "all 0.15s" }}
                        onMouseEnter={(e) => { if (activeIssues.length > 0) { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary)"; }}}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-sub)"; e.currentTarget.style.color = "var(--text)"; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export Excel
                      </button>
                      <button
                        onClick={() => publishMilestoneFromLabels(activeIssues, selectedLabels, currentBoard?.name)}
                        disabled={labelActionLoading || activeIssues.length === 0}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 7, border: "2px solid var(--color-primary)", background: "var(--bg-primary-subtle)", color: "var(--color-primary)", fontSize: 12, fontWeight: 600, cursor: activeIssues.length === 0 ? "not-allowed" : "pointer", opacity: activeIssues.length === 0 ? 0.5 : 1, transition: "all 0.15s" }}
                      >
                        {labelActionLoading
                                    ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Publishing...</>
                          : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg> Confluence Report</>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Timeline row */}
                  {(stats.startDate || stats.endDate) && (
                    <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-sub)", display: "flex", gap: 24, flexWrap: "wrap" }}>
                      {[
                        { label: "Start", value: formatDateShort(stats.startDate) },
                        { label: "End", value: formatDateShort(stats.endDate) },
                        ...(daysRange !== null ? [{ label: "Duration", value: `${daysRange} days` }] : []),
                      ].map(({ label, value }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hi)" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-sub)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)" }}>Progress</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: stats.donePercentage >= 100 ? "#10b981" : "var(--color-primary)" }}>{stats.donePercentage}% Complete</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 5, background: "var(--bg)", border: "1px solid var(--border)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(stats.donePercentage, 100)}%`,
                        background: stats.donePercentage >= 100 ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#3b82f6,#10b981)",
                        transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                        boxShadow: `0 0 10px ${stats.donePercentage >= 100 ? "rgba(16,185,129,0.45)" : "rgba(59,130,246,0.45)"}`,
                      }}/>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "var(--text-4)" }}>
                      <span>{stats.doneCount} of {stats.issueCount} done</span>
                      <span>{Math.round((stats.doneSP / stats.totalSP) * 100 || 0)}% SP done</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                    {[
                      { label: "Total Issues", value: stats.issueCount, color: "var(--text)" },
                      { label: "Total SP", value: stats.totalSP, color: "var(--color-primary)" },
                      { label: "Done SP", value: stats.doneSP, color: "#10b981" },
                      { label: "Done Count", value: stats.doneCount, color: "#10b981" },
                      { label: "Rejected", value: stats.rejectedCount, color: "#ef4444" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: "var(--bg)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-sub)" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </>
      ) : (
        <div style={{ padding: "32px 24px", textAlign: "center", borderRadius: 10, background: "var(--bg-subtle)", border: "1px dashed var(--border-sub)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", margin: "0 0 4px 0" }}>Select a team board to get started</p>
          <p style={{ fontSize: 12, color: "var(--text-4)", margin: 0 }}>Choose a board above to view its labels and generate milestone reports.</p>
        </div>
      )}
    </div>
  );
}
