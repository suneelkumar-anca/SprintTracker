import Combobox from "../ui/Combobox.jsx";
import SprintPanelActions from "./SprintPanelActions.jsx";

const BOARD_ICON = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const SPRINT_ICON = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2"><path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.36-2.64L3 15M3 21v-6h6"/><path d="M3 12a9 9 0 019-9 9 9 0 016.36 2.64L21 9M21 3v6h-6"/></svg>;

export default function SprintPanelHeader({
  boards, boardsLoading, selectedBoardId, onBoardChange,
  boardSprints, sprintsLoading, selectedSprintId, onSprintChange,
  selectedBoardType, filteredCount, totalCount, hasActiveFilters,
  sprintLoading, onRefresh, isAlreadySaved, saveFeedback, sprintLoaded, ticketCount,
  onSave, onExport,
}) {
  const headerLabel = sprintLoading ? "Loading sprint…"
    : sprintLoaded ? `Sprint Tickets  ${filteredCount}${hasActiveFilters ? ` / ${totalCount}` : ""}` : "Sprint Tickets";

  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{headerLabel}</span>
        <SprintPanelActions onRefresh={onRefresh} boardsLoading={boardsLoading} sprintLoaded={sprintLoaded}
          ticketCount={ticketCount} onSave={onSave} isAlreadySaved={isAlreadySaved} saveFeedback={saveFeedback}
          filteredCount={filteredCount} onExport={onExport} />
      </div>
      <div style={{ marginBottom: 6 }}>
        <Combobox options={boards.map((b) => ({ value: String(b.id), label: b.name + (b.projectKey ? ` (${b.projectKey})` : "") + (b.type ? ` · ${b.type}` : "") }))}
          value={selectedBoardId} onChange={onBoardChange}
          placeholder={boardsLoading ? "Loading boards…" : boards.length > 0 ? "Search or select a board…" : "No boards found"}
          loading={boardsLoading} accentColor="#3b82f6" icon={BOARD_ICON} />
      </div>
      {selectedBoardId && selectedBoardType !== "kanban" && (
        <div style={{ marginBottom: 8 }}>
          <Combobox options={boardSprints.map((s) => ({ value: String(s.id), label: s.name, badge: s.state }))}
            value={selectedSprintId} onChange={onSprintChange}
            placeholder={sprintsLoading ? "Loading sprints…" : boardSprints.length > 0 ? "Search or select a sprint…" : "No sprints found"}
            loading={sprintsLoading} accentColor="#818cf8" icon={SPRINT_ICON} />
        </div>
      )}
    </div>
  );
}
