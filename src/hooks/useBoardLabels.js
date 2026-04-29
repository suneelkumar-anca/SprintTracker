import { useState, useEffect, useCallback, useRef } from "react";
import { fetchBoardsByTeam, fetchBoardLabels, fetchIssuesByLabels, fetchBoardEpics, fetchLabelsByEpic, fetchIssuesByEpicGlobal } from "../services/jira/fetchBoardsByTeam.js";
import { mapIssue } from "../services/jira/mapIssue.js";
import { detectStoryPointsField } from "../services/jira/storyPointsDetector.js";

/**
 * Hook to manage team boards, labels, and label-filtered issues
 * @param {string} projectLocation - The project location ID (e.g., "10108")
 * @returns {Object} { boards, selectedBoardId, setSelectedBoardId, labels, selectedLabels, setSelectedLabels, issues, loading, error }
 */
export function useBoardLabels(projectLocation = null) {
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [epics, setEpics] = useState([]);
  const [selectedEpicId, setSelectedEpicId] = useState("");
  const [epicsLoading, setEpicsLoading] = useState(false);
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Global epic mode
  const [selectedGlobalEpicId, setSelectedGlobalEpicId] = useState("");
  const [selectedGlobalEpicKey, setSelectedGlobalEpicKey] = useState("");
  const [selectedGlobalEpicName, setSelectedGlobalEpicName] = useState("");
  // Ref to guard effects from clearing state while global epic fetch is in-flight
  const globalEpicActiveRef = useRef(false);
  // Ref so selectGlobalEpic always sees the latest boards without being recreated
  const boardsRef = useRef([]);

  // Detect story points field on mount
  useEffect(() => {
    detectStoryPointsField();
  }, []);

  // Fetch boards when project location changes
  useEffect(() => {
    let mounted = true;

    async function loadBoards() {
      try {
        setLoading(true);
        setError(null);
        const boardList = await fetchBoardsByTeam(projectLocation);
        
        if (!mounted) return;
        setBoards(boardList);
        boardsRef.current = boardList;
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to fetch boards");
          setBoards([]);
          boardsRef.current = [];
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBoards();
    return () => { mounted = false; };
  }, [projectLocation]);

  // Fetch epics when selected board changes
  useEffect(() => {
    let mounted = true;
    if (!selectedBoardId) { setEpics([]); setSelectedEpicId(""); return; }

    const board = boards.find(b => String(b.id) === String(selectedBoardId));
    setEpicsLoading(true);
    fetchBoardEpics(selectedBoardId, board?.projectKey ?? null)
      .then(list => { if (mounted) setEpics(list); })
      .catch(() => { if (mounted) setEpics([]); })
      .finally(() => { if (mounted) setEpicsLoading(false); });

    return () => { mounted = false; };
  }, [selectedBoardId, boards]);

  // Fetch labels when board or selected epic changes
  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      if (!selectedBoardId) {
        if (!globalEpicActiveRef.current) {
          setLabels([]);
          setSelectedLabels([]);
          setIssues([]);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const board = boards.find(b => String(b.id) === String(selectedBoardId));
        const selectedEpic = epics.find(e => e.id === selectedEpicId);
        const labelList = selectedEpicId
          ? await fetchLabelsByEpic(selectedBoardId, selectedEpicId, selectedEpic?.key ?? null, board?.projectKey ?? null)
          : await fetchBoardLabels(selectedBoardId);

        if (!mounted) return;
        setLabels(labelList);
        setSelectedLabels([]); // Reset selected labels when board/epic changes
        setIssues([]);
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to fetch labels");
          setLabels([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadLabels();
    return () => { mounted = false; };
  }, [selectedBoardId, selectedEpicId, boards, epics]);

  // Fetch issues when selected labels change
  useEffect(() => {
    let mounted = true;

    async function loadIssues() {
      if (!selectedBoardId || selectedLabels.length === 0) {
        if (!globalEpicActiveRef.current) setIssues([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const board = boards.find((b) => b.id === selectedBoardId);
        const issueList = await fetchIssuesByLabels(selectedBoardId, board?.projectKey, selectedLabels);
        
        if (!mounted) return;
        
        // Map issues to app format
        const mappedIssues = issueList.map(mapIssue);
        setIssues(mappedIssues);
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to fetch issues");
          setIssues([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadIssues();
    return () => { mounted = false; };
  }, [selectedBoardId, selectedLabels, boards]);

  const toggleLabel = (label) => {
    setSelectedLabels((prev) => {
      if (prev.includes(label)) {
        return prev.filter((l) => l !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  // Select a global epic: fetch all its issues and extract labels (board-independent)
  const selectGlobalEpic = useCallback(async (epicId, epicKey, epicName) => {
    globalEpicActiveRef.current = !!epicId;
    setSelectedBoardId("");
    setSelectedEpicId("");
    setSelectedLabels([]);
    setIssues([]);
    setLabels([]);
    setSelectedGlobalEpicId(epicId || "");
    setSelectedGlobalEpicKey(epicKey || "");
    setSelectedGlobalEpicName(epicName || "");

    if (!epicKey) {
      globalEpicActiveRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rawIssues = await fetchIssuesByEpicGlobal(epicKey, epicId, boardsRef.current.map(b => String(b.id)));
      const mapped = rawIssues.map(mapIssue);
      const labelSet = new Set();
      for (const issue of rawIssues) {
        for (const lbl of issue.fields?.labels ?? []) {
          if (lbl && typeof lbl === "string") labelSet.add(lbl);
        }
      }
      setIssues(mapped);
      setLabels([...labelSet].sort());
    } catch (err) {
      setError(err.message || "Failed to fetch epic issues");
    } finally {
      setLoading(false);
    }
  }, []);

  // When labels are toggled in global epic mode, filter the already-fetched issues locally
  const globalEpicFilteredIssues = selectedGlobalEpicId && issues.length > 0 && selectedLabels.length > 0
    ? issues.filter(issue =>
        selectedLabels.some(lbl => (issue.labels ?? []).map(l => l.toLowerCase()).includes(lbl.toLowerCase()))
      )
    : selectedGlobalEpicId ? issues : null;

  return {
    boards,
    selectedBoardId,
    setSelectedBoardId,
    epics,
    selectedEpicId,
    setSelectedEpicId,
    epicsLoading,
    labels,
    selectedLabels,
    setSelectedLabels,
    toggleLabel,
    issues: globalEpicFilteredIssues ?? issues,
    loading,
    error,
    // Global epic mode
    selectedGlobalEpicId,
    selectedGlobalEpicKey,
    selectedGlobalEpicName,
    selectGlobalEpic,
  };
}
