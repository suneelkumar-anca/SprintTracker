import { useMemo, useCallback } from "react";

export function useAppHandlers(state) {
  const { lookup, filters, saved, selectedBoardId, setSelectedBoardId,
    setSelectedSprintId, loadSnapshot, setActiveView, skipAutoSelectRef,
    currentSprintName, refreshBoards } = state;

  const handleSelectTicket = useCallback((id) => {
    setActiveView("tracker");
    lookup.setQuery(id);
    lookup.setPendingLookup(id);
  }, [lookup.setQuery, lookup.setPendingLookup]);

  const handleExport = useCallback(
    async () => { const { exportToExcel } = await import("../services/excel/index.js"); exportToExcel(filters.filteredTickets, currentSprintName); },
    [filters.filteredTickets, currentSprintName]
  );

  const handlePublishSprintReport = useCallback(
    async (report) => {
      const { publishSprintPage } = await import("../services/confluence/index.js");
      const result = await publishSprintPage(report.tickets, report.name);
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error);
      }
    },
    []
  );

  const handlePublishRetrospective = useCallback(
    async (report) => {
      const { publishRetrospectivePage } = await import("../services/confluence/index.js");
      const result = await publishRetrospectivePage(report.tickets, report.name);
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error);
      }
    },
    []
  );

  const handleLoadSnapshot = useCallback((r) => {
    skipAutoSelectRef.current = true;
    setSelectedBoardId(r.boardId ?? selectedBoardId);
    setSelectedSprintId(String(r.sprintId ?? ""));
    loadSnapshot(r.tickets);
    filters.clearFilters();
    setActiveView("tracker");
  }, [selectedBoardId, loadSnapshot, filters.clearFilters]);

  const sprintPanelProps = useMemo(() => ({
    boards: state.boards, boardsLoading: state.boardsLoading, selectedBoardId: state.selectedBoardId, onBoardChange: setSelectedBoardId,
    boardSprints: state.boardSprints, sprintsLoading: state.sprintsLoading, selectedSprintId: state.selectedSprintId, onSprintChange: setSelectedSprintId,
    selectedBoardType: state.selectedBoardType, sprintLoading: state.sprintLoading, sprintLoaded: state.sprintLoaded,
    filteredTickets: filters.filteredTickets, hasActiveFilters: filters.hasActiveFilters,
    totalTickets: state.sprintTickets.length, activeTicketId: lookup.ticket?.id, onSelectTicket: handleSelectTicket,
    filterAssignee: filters.filterAssignee, setFilterAssignee: filters.setFilterAssignee, uniqueAssignees: filters.uniqueAssignees,
    filterStatus: filters.filterStatus, setFilterStatus: filters.setFilterStatus, uniqueStatuses: filters.uniqueStatuses,
    filterStart: filters.filterStart, setFilterStart: filters.setFilterStart,
    filterEnd: filters.filterEnd, setFilterEnd: filters.setFilterEnd, clearFilters: filters.clearFilters,
    isAlreadySaved: saved.isAlreadySaved, saveFeedback: saved.saveFeedback,
    onSave: saved.saveCurrentSprint, onExport: handleExport, onRefresh: refreshBoards,
  }), [
    state.boards, state.boardsLoading, state.selectedBoardId, state.boardSprints, state.sprintsLoading, state.selectedSprintId,
    state.selectedBoardType, state.sprintLoading, state.sprintLoaded,
    filters.filteredTickets, filters.hasActiveFilters, filters.filterAssignee, filters.filterStatus, filters.filterStart, filters.filterEnd,
    filters.uniqueAssignees, filters.uniqueStatuses, filters.setFilterAssignee, filters.setFilterStatus, filters.setFilterStart, filters.setFilterEnd, filters.clearFilters,
    state.sprintTickets.length, lookup.ticket?.id, handleSelectTicket, saved.isAlreadySaved, saved.saveFeedback, saved.saveCurrentSprint, handleExport, refreshBoards,
  ]);

  return { handleSelectTicket, handleExport, handlePublishSprintReport, handlePublishRetrospective, handleLoadSnapshot, sprintPanelProps };
}
