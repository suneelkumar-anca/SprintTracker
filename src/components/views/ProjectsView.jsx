import { useState, useCallback, useRef, useEffect } from "react";
import { useProjects } from "../../hooks/useProjects.js";
import BoardSelector from "./BoardSelector.jsx";
import ProjectCard from "./ProjectCard.jsx";
import { exportProjectsReport } from "../../services/excel/excelProjectExport.js";

const CHART_ICON = "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z";

function SectionLabel({ children, sub, mb = 0 }) {
  return (
    <div style={{ marginBottom: mb }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
        color: "var(--text-3)" }}>{children}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>{sub}</span>}
    </div>
  );
}

function Skeleton({ count = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: 56, borderRadius: 12, background: "var(--bg-elevated)",
          border: "1px solid var(--border-sub)", animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

export default function ProjectsView({ configured }) {
  const {
    boards, boardsLoading, boardsError,
    selectedBoardId, setSelectedBoardId,
    searchBoards,
    epics, epicsLoading,
    projectStats, loadEpicStats,
    setOverride, getOverride,
  } = useProjects(null);

  const [boardSearch, setBoardSearch] = useState("");
  const debounceRef = useRef(null);

  // Debounced board search — fires 400ms after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchBoards(boardSearch);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [boardSearch, searchBoards]);

  const selectedBoardName = boards.find(b => String(b.id) === String(selectedBoardId))?.name ?? null;

  const handleSelectBoard = useCallback((id) => {
    setSelectedBoardId(prev => String(prev) === String(id) ? "" : id);
  }, [setSelectedBoardId]);

  const handleExpand = useCallback((epicId, epicKey) => {
    loadEpicStats(epicKey, epicId);
  }, [loadEpicStats]);

  const handleExportAll = useCallback(async () => {
    const loaded = epics
      .filter(e => projectStats[e.key]?.status === "loaded")
      .map(e => ({ epic: e, data: projectStats[e.key].data, override: getOverride(e.key) }));
    if (loaded.length === 0) return;
    await exportProjectsReport(loaded, selectedBoardName ?? "Projects");
  }, [epics, projectStats, getOverride, selectedBoardName]);

  return (
    <div style={{ padding: "28px 28px 60px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 1px rgba(124,58,237,0.35), 0 4px 12px rgba(79,70,229,0.3)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={CHART_ICON} />
            </svg>
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-hi)" }}>Projects</h2>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-3)", maxWidth: 620 }}>
          Select a board to load all its epics as project cards. Expand each card to see ticket counts,
          logged mandays, team breakdown, issues, and to record decisions.
        </p>
      </div>

      {/* ── Step 1: Board selection ── */}
      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-sub)",
        borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
        <SectionLabel mb={12} sub={boardSearch.trim() && boards.length > 0 ? `${boards.length} boards found` : undefined}>
          1. Select Team Board
        </SectionLabel>

        <input
          type="text"
          placeholder="Type board name to search… (min 2 chars)"
          value={boardSearch}
          onChange={e => setBoardSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 360, padding: "8px 12px", borderRadius: 8, marginBottom: 14,
            border: "1px solid var(--border-sub)", background: "var(--bg)",
            color: "var(--text-hi)", fontSize: 13, fontFamily: "inherit", outline: "none",
            boxSizing: "border-box" }}
        />

        {boardsError && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{boardsError}</div>
        )}

        <BoardSelector
          boards={boards}
          selectedBoardId={selectedBoardId}
          onSelectBoard={handleSelectBoard}
          loading={boardsLoading}
        />
      </div>

      {/* ── Step 2: Epic project cards ── */}
      {selectedBoardId && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-sub)",
          borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionLabel
              sub={epicsLoading ? "Loading…" : `${epics.length} epics on ${selectedBoardName ?? "this board"}`}>
              2. Project Cards
            </SectionLabel>
            {!epicsLoading && epics.length > 0 && (
              <button
                onClick={handleExportAll}
                title="Export all loaded project cards to Excel"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7,
                  border: "1px solid #22c55e55", background: "#22c55e18", color: "#22c55e",
                  fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export All
              </button>
            )}
          </div>

          {epicsLoading && <Skeleton count={4} />}

          {!epicsLoading && epics.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              No epics found on this board.
            </div>
          )}

          {!epicsLoading && epics.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {epics.map(epic => (
                <ProjectCard
                  key={epic.key}
                  epic={epic}
                  statsEntry={projectStats[epic.key]}
                  override={getOverride(epic.key)}
                  onExpand={handleExpand}
                  onOverrideChange={setOverride}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!selectedBoardId && !boardsLoading && boards.length > 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-3)", fontSize: 13 }}>
          Select a board above to load its epics as project cards.
        </div>
      )}

      {/* spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}
