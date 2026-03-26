import SprintPanelHeader from "./SprintPanelHeader.jsx";
import SprintPanelFilters from "./SprintPanelFilters.jsx";
import TicketList from "./TicketList.jsx";

export default function SprintPanel({
  boards, boardsLoading, selectedBoardId, onBoardChange,
  boardSprints, sprintsLoading, selectedSprintId, onSprintChange,
  selectedBoardType, sprintLoading, sprintLoaded, filteredTickets,
  hasActiveFilters, totalTickets, activeTicketId, onSelectTicket,
  filterAssignee, setFilterAssignee, uniqueAssignees,
  filterStatus, setFilterStatus, uniqueStatuses,
  filterStart, setFilterStart, filterEnd, setFilterEnd, clearFilters,
  isAlreadySaved, saveFeedback, onSave, onExport, onRefresh,
}) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16, position: "sticky", top: 68, maxHeight: "calc(100vh - 92px)", display: "flex", flexDirection: "column" }}>
      <SprintPanelHeader
        boards={boards} boardsLoading={boardsLoading} selectedBoardId={selectedBoardId} onBoardChange={onBoardChange}
        boardSprints={boardSprints} sprintsLoading={sprintsLoading} selectedSprintId={selectedSprintId} onSprintChange={onSprintChange}
        selectedBoardType={selectedBoardType} sprintLoading={sprintLoading} sprintLoaded={sprintLoaded}
        filteredCount={filteredTickets.length} totalCount={totalTickets} hasActiveFilters={hasActiveFilters}
        isAlreadySaved={isAlreadySaved} saveFeedback={saveFeedback} ticketCount={totalTickets}
        onSave={onSave} onExport={onExport} onRefresh={onRefresh} />
      <SprintPanelFilters
        filterAssignee={filterAssignee} setFilterAssignee={setFilterAssignee} uniqueAssignees={uniqueAssignees}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus} uniqueStatuses={uniqueStatuses}
        filterStart={filterStart} setFilterStart={setFilterStart} filterEnd={filterEnd} setFilterEnd={setFilterEnd}
        hasActiveFilters={hasActiveFilters} clearFilters={clearFilters} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {sprintLoading ? (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 12px", display: "block" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            <p style={{ fontSize: 12, color: "var(--text-4)", margin: 0 }}>Loading…</p>
          </div>
        ) : (
          <TicketList tickets={filteredTickets} activeId={activeTicketId} onSelect={onSelectTicket} />
        )}
      </div>
    </div>
  );
}
