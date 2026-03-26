import { useState, useCallback } from "react";
import { loadSavedReports, saveReport, deleteReport, reorderReports } from "../services/storage.js";

export function useSavedReports(sprintTickets, selectedSprintId, selectedBoardId, boardSprints) {
  const [savedReports, setSavedReports] = useState(() => loadSavedReports());
  const [saveFeedback, setSaveFeedback] = useState(null);

  const isAlreadySaved = savedReports.some(
    (r) => selectedSprintId && r.sprintId === selectedSprintId &&
           selectedBoardId  && r.boardId  === selectedBoardId
  );

  const saveCurrentSprint = useCallback(() => {
    if (!sprintTickets.length) return;
    const sprintName =
      boardSprints.find((s) => String(s.id) === String(selectedSprintId))?.name
      ?? sprintTickets[0]?.sprintName
      ?? `Sprint ${selectedSprintId || "Active"}`;
    const existing = savedReports.find(
      (r) => selectedSprintId && r.sprintId === selectedSprintId &&
             selectedBoardId  && r.boardId  === selectedBoardId
    );
    saveReport({
      id: existing?.id ?? `${Date.now()}`,
      name: sprintName,
      boardId: selectedBoardId,
      sprintId: selectedSprintId,
      savedAt: new Date().toISOString(),
      tickets: sprintTickets,
    });
    setSavedReports(loadSavedReports());
    setSaveFeedback(isAlreadySaved ? "updated" : "saved");
    setTimeout(() => setSaveFeedback(null), 2000);
  }, [sprintTickets, boardSprints, selectedSprintId, selectedBoardId, savedReports, isAlreadySaved]);

  const removeSavedReport = useCallback((id) => {
    deleteReport(id); setSavedReports(loadSavedReports());
  }, []);

  const reorderSaved = useCallback((newOrder) => {
    reorderReports(newOrder); setSavedReports(newOrder);
  }, []);

  return { savedReports, isAlreadySaved, saveFeedback, saveCurrentSprint, removeSavedReport, reorderSaved };
}
