import { useState, useEffect } from "react";
import { fetchMilestoneTickets, computeMilestoneStats, getUniqueMilestones, getUniqueTeams } from "../services/jira/fetchMilestones.js";

/**
 * Hook to fetch and compute milestones independently with filters
 * Fetches data per-board (mirrors fetchSprintTickets behavior)
 * @param {string} boardId - The Jira board ID to fetch from
 * @param {string} startDate - ISO date string (YYYY-MM-DD) for start of range (optional)
 * @param {string} endDate - ISO date string (YYYY-MM-DD) for end of range (optional)
 * @param {string} teamFilter - Team name to filter by (optional)
 * @returns {Object} { allMilestones, milestoneMap, loading, error, uniqueMilestones, uniqueTeams }
 */
export function useIndependentMilestones(boardId = null, startDate = null, endDate = null, teamFilter = null) {
  const [allMilestones, setAllMilestones] = useState([]);
  const [milestoneMap, setMilestoneMap] = useState({});
  const [uniqueMilestones, setUniqueMilestones] = useState([]);
  const [uniqueTeams, setUniqueTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadMilestones() {
      try {
        setLoading(true);
        setError(null);

        // Only fetch if board is selected
        if (!boardId) {
          setAllMilestones([]);
          setMilestoneMap({});
          setUniqueMilestones([]);
          setUniqueTeams([]);
          setLoading(false);
          return;
        }

        // Fetch tickets per-board (independent of other tabs)
        const tickets = await fetchMilestoneTickets(boardId, startDate, endDate);

        if (!mounted) return;

        // Filter by team if specified
        const filteredTickets = teamFilter 
          ? tickets.filter(t => t.team === teamFilter)
          : tickets;

        // Compute milestone statistics
        const { allMilestones: computed, milestoneMap: map } = computeMilestoneStats(filteredTickets);
        const uniqueNames = getUniqueMilestones(filteredTickets);
        const teams = getUniqueTeams(tickets); // Get teams from all tickets (before team filter)

        setAllMilestones(computed);
        setMilestoneMap(map);
        setUniqueMilestones(uniqueNames);
        setUniqueTeams(teams);
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to fetch milestones");
          setAllMilestones([]);
          setMilestoneMap({});
          setUniqueMilestones([]);
          setUniqueTeams([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMilestones();

    return () => {
      mounted = false;
    };
  }, [boardId, startDate, endDate, teamFilter]);

  return { allMilestones, milestoneMap, loading, error, uniqueMilestones, uniqueTeams };
}
