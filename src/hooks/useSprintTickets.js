import { useState, useEffect, useRef, useCallback } from "react";
import { fetchSprintTickets } from "../services/jira/fetchSprintTickets.js";
import { fetchKanbanTickets } from "../services/jira/fetchKanbanTickets.js";

export function useSprintTickets(configured, sprintId, boardId, boardType) {
  const [sprintTickets, setSprintTickets] = useState([]);
  const [sprintLoading, setSprintLoading] = useState(false);
  const [sprintLoaded,  setSprintLoaded]  = useState(false);
  const [sprintError,   setSprintError]   = useState("");

  // When a saved snapshot is injected, skip the next auto-fetch triggered by ID changes.
  const frozenRef = useRef(false);

  const loadSnapshot = useCallback((tickets) => {
    frozenRef.current = true;
    setSprintTickets(tickets);
    setSprintLoaded(true);
    setSprintLoading(false);
    setSprintError("");
  }, []);

  useEffect(() => {
    if (!configured || !boardId) return;
    if (boardType === "kanban") {
      if (frozenRef.current) { frozenRef.current = false; return; }
      setSprintLoading(true); setSprintLoaded(false); setSprintTickets([]);
      fetchKanbanTickets(boardId)
        .then((list) => { setSprintTickets(list); setSprintLoaded(true); })
        .catch((err) => { setSprintError(err?.message ?? "Failed to load board tickets."); setSprintLoaded(true); })
        .finally(() => setSprintLoading(false));
    }
  }, [configured, boardId, boardType]);

  useEffect(() => {
    if (!configured || !sprintId || boardType === "kanban") return;
    if (frozenRef.current) { frozenRef.current = false; return; }
    setSprintLoading(true); setSprintLoaded(false); setSprintTickets([]);
    setSprintError("");
    fetchSprintTickets(sprintId)
      .then((list) => { setSprintTickets(list); setSprintLoaded(true); })
      .catch((err) => { setSprintError(err?.message ?? "Failed to load sprint tickets."); setSprintLoaded(true); })
      .finally(() => setSprintLoading(false));
  }, [configured, sprintId, boardType]);

  return { sprintTickets, sprintLoading, sprintLoaded, sprintError, setSprintTickets, loadSnapshot };
}
