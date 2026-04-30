import { useState, useEffect, useCallback, useRef } from "react";
import { fetchBoardsByTeam, fetchBoardEpics, fetchEpicChildStats } from "../services/jira/fetchBoardsByTeam.js";
import { jiraGet } from "../services/jira/jiraClient.js";

/**
 * Manages state for the Projects tab.
 * - Loads boards for a project location
 * - Loads all epics when a board is selected
 * - Lazily fetches child stats per epic (on expand)
 * - Tracks per-epic user overrides: holidays, leaves, decisions
 */
export function useProjects(projectLocation = null) {
  const [boards, setBoards]               = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardsError, setBoardsError]     = useState(null);

  const [selectedBoardId, setSelectedBoardId] = useState("");

  const [epics, setEpics]               = useState([]);
  const [epicsLoading, setEpicsLoading] = useState(false);

  // projectStats: { [epicKey]: { status: "idle"|"loading"|"loaded"|"error", data, error } }
  const [projectStats, setProjectStats] = useState({});

  // overrides: { [epicKey]: { leaveDays: number|null, publicHolidays: number|null, decisions: string } }
  // null = use auto-fetched value from Tempo worklogs
  const [overrides, setOverrides] = useState({});

  // Ref so callbacks always see current boards without stale closures
  const boardsRef = useRef([]);

  // ── Load boards ────────────────────────────────────────────────────────────
  // Only auto-load if a specific projectLocation is given.
  // Otherwise boards are loaded on-demand via searchBoards().
  useEffect(() => {
    if (!projectLocation) return;
    let mounted = true;
    setBoardsLoading(true);
    setBoardsError(null);
    fetchBoardsByTeam(projectLocation)
      .then(list => {
        if (!mounted) return;
        setBoards(list);
        boardsRef.current = list;
      })
      .catch(err => { if (mounted) setBoardsError(err.message || "Failed to fetch boards"); })
      .finally(() => { if (mounted) setBoardsLoading(false); });
    return () => { mounted = false; };
  }, [projectLocation]);

  // ── Search boards by name (for when no projectLocation) ───────────────────
  const searchBoards = useCallback(async (query) => {
    if (!query || query.trim().length < 2) { setBoards([]); boardsRef.current = []; return; }
    setBoardsLoading(true);
    setBoardsError(null);
    try {
      const data = await jiraGet(`/rest/agile/1.0/board?name=${encodeURIComponent(query.trim())}&maxResults=30`);
      const list = (data?.values ?? []).map(b => ({
        id: String(b.id),
        name: b.name,
        type: b.type ?? "scrum",
        projectKey: b.location?.projectKey ?? null,
      }));
      setBoards(list);
      boardsRef.current = list;
    } catch (err) {
      setBoardsError(err.message || "Search failed");
    } finally {
      setBoardsLoading(false);
    }
  }, []);

  // ── Load epics when board changes ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedBoardId) { setEpics([]); return; }
    let mounted = true;
    setEpicsLoading(true);
    setProjectStats({});
    const board = boardsRef.current.find(b => String(b.id) === String(selectedBoardId));
    fetchBoardEpics(selectedBoardId, board?.projectKey ?? null)
      .then(list => { if (mounted) setEpics(list); })
      .catch(() => { if (mounted) setEpics([]); })
      .finally(() => { if (mounted) setEpicsLoading(false); });
    return () => { mounted = false; };
  }, [selectedBoardId]);

  // ── Lazy-load stats for a single epic (called on card expand) ─────────────
  const loadEpicStats = useCallback((epicKey, epicId) => {
    if (!epicKey) return;
    setProjectStats(prev => {
      if (prev[epicKey]?.status === "loading" || prev[epicKey]?.status === "loaded") return prev;
      return { ...prev, [epicKey]: { status: "loading", data: null, error: null } };
    });

    const allBoardIds = boardsRef.current.map(b => String(b.id));
    fetchEpicChildStats(epicKey, epicId, allBoardIds)
      .then(data => {
        setProjectStats(prev => ({ ...prev, [epicKey]: { status: "loaded", data, error: null } }));
      })
      .catch(err => {
        setProjectStats(prev => ({ ...prev, [epicKey]: { status: "error", data: null, error: err.message } }));
      });
  }, []);

  // ── Update per-epic override field ────────────────────────────────────────
  const setOverride = useCallback((epicKey, field, value) => {
    setOverrides(prev => ({
      ...prev,
      [epicKey]: { leaveDays: null, publicHolidays: null, decisions: "", memberLeave: {}, ...(prev[epicKey] ?? {}), [field]: value },
    }));
  }, []);

  const getOverride = useCallback((epicKey) => ({
    leaveDays: null,
    publicHolidays: null,
    decisions: "",
    memberLeave: {},
    ...(overrides[epicKey] ?? {}),
  }), [overrides]);

  return {
    boards,
    boardsLoading,
    boardsError,
    selectedBoardId,
    setSelectedBoardId,
    searchBoards,
    epics,
    epicsLoading,
    projectStats,
    loadEpicStats,
    setOverride,
    getOverride,
  };
}
