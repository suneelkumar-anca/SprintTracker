import { useState, useEffect, useRef, useMemo } from "react";
import { isJiraConfigured } from "../services/jira/fetchComments.js";
import { ENV_BOARD_ID } from "../services/jira/jiraConfig.js";
import { useThemePref } from "./useThemePref.js";
import { useBoards } from "./useBoards.js";
import { useSprints } from "./useSprints.js";
import { useSprintTickets } from "./useSprintTickets.js";
import { useTicketLookup } from "./useTicketLookup.js";
import { useFilters } from "./useFilters.js";
import { useSavedReports } from "./useSavedReports.js";

export function useAppState() {
  const configured = isJiraConfigured();
  const [activeView, setActiveView] = useState("saved");
  const [selectedBoardId, setSelectedBoardId] = useState(ENV_BOARD_ID);
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [themePref, setThemePref] = useThemePref();
  const { boards, boardsLoading, refreshBoards } = useBoards(configured);
  const { boardSprints, sprintsLoading, selectedBoardType } = useSprints(selectedBoardId, boards);
  const { sprintTickets, sprintLoading, sprintLoaded, loadSnapshot } = useSprintTickets(configured, selectedSprintId, selectedBoardId, selectedBoardType);
  const lookup = useTicketLookup();
  const filters = useFilters(sprintTickets);
  const saved = useSavedReports(sprintTickets, selectedSprintId, selectedBoardId, boardSprints);
  const skipAutoSelectRef = useRef(false);

  useEffect(() => {
    if (skipAutoSelectRef.current) { skipAutoSelectRef.current = false; return; }
    const active = boardSprints.find(s => s.state === "active");
    setSelectedSprintId(active ? String(active.id) : "");
  }, [boardSprints]);

  useEffect(() => {
    if (lookup.pendingLookup && activeView === "tracker") {
      lookup.setPendingLookup(null);
      lookup.lookup(lookup.pendingLookup);
    }
  }, [lookup.pendingLookup, activeView]);

  const currentSprintName = useMemo(
    () => boardSprints.find(s => String(s.id) === String(selectedSprintId))?.name ?? sprintTickets[0]?.sprintName ?? "Active",
    [boardSprints, selectedSprintId, sprintTickets]
  );
  const currentSprint = useMemo(() => boardSprints.find(s => String(s.id) === String(selectedSprintId)) ?? null, [boardSprints, selectedSprintId]);
  const totalSP = useMemo(() => sprintTickets.reduce((s, t) => s + (Number.isFinite(t.sp) ? t.sp : 0), 0), [sprintTickets]);
  const doneSP = useMemo(() => sprintTickets.filter(t => t.status?.toLowerCase() === "done").reduce((s, t) => s + (Number.isFinite(t.sp) ? t.sp : 0), 0), [sprintTickets]);
  const doneCount = useMemo(() => sprintTickets.filter(t => t.status?.toLowerCase() === "done").length, [sprintTickets]);

  return {
    configured, activeView, setActiveView, selectedBoardId, setSelectedBoardId,
    selectedSprintId, setSelectedSprintId, themePref, setThemePref,
    boards, boardsLoading, refreshBoards, boardSprints, sprintsLoading, selectedBoardType,
    sprintTickets, sprintLoading, sprintLoaded, loadSnapshot, lookup, filters, saved,
    skipAutoSelectRef, currentSprintName, currentSprint, totalSP, doneSP, doneCount,
  };
}
