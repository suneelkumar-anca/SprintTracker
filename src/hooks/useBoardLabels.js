import { useState, useEffect } from "react";
import { fetchBoardsByTeam, fetchBoardLabels, fetchIssuesByLabels } from "../services/jira/fetchBoardsByTeam.js";
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
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to fetch boards");
          setBoards([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBoards();
    return () => { mounted = false; };
  }, [projectLocation]);

  // Fetch labels when selected board changes
  useEffect(() => {
    let mounted = true;

    async function loadLabels() {
      if (!selectedBoardId) {
        setLabels([]);
        setSelectedLabels([]);
        setIssues([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const labelList = await fetchBoardLabels(selectedBoardId);
        
        if (!mounted) return;
        setLabels(labelList);
        setSelectedLabels([]); // Reset selected labels when board changes
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
  }, [selectedBoardId]);

  // Fetch issues when selected labels change
  useEffect(() => {
    let mounted = true;

    async function loadIssues() {
      if (!selectedBoardId || selectedLabels.length === 0) {
        setIssues([]);
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

  return {
    boards,
    selectedBoardId,
    setSelectedBoardId,
    labels,
    selectedLabels,
    setSelectedLabels,
    toggleLabel,
    issues,
    loading,
    error,
  };
}
