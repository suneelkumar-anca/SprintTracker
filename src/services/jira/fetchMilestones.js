import { jiraGet, paginateIssues } from "./jiraClient.js";
import { detectStoryPointsField } from "./storyPointsDetector.js";
import { mapIssue } from "./mapIssue.js";
import { buildIssueFields } from "./buildFields.js";

/**
 * Fetch milestones (unique labels) independently per board with optional filters for date range
 * This mirrors fetchSprintTickets - it fetches from a specific board, not globally
 * @param {string} boardId - The Jira board ID to fetch from
 * @param {string} startDate - ISO date string (YYYY-MM-DD) for start of range (optional filtering in memory)
 * @param {string} endDate - ISO date string (YYYY-MM-DD) for end of range (optional filtering in memory)
 * @returns {Promise<Array>} Array of mapped issues with milestone (label) data
 */
export async function fetchMilestoneTickets(boardId, startDate = null, endDate = null) {
  if (!boardId) {
    console.warn("No board ID provided - cannot fetch milestones");
    return [];
  }

  await detectStoryPointsField();
  const fields = buildIssueFields(false);

  try {
    // Fetch board details to get project key for fallback JQL
    let projectKey = null;
    try {
      const boardData = await jiraGet(`/rest/agile/1.0/board/${boardId}`);
      projectKey = boardData.project?.key;
    } catch (err) {
      console.warn("Could not fetch board details:", err.message);
    }

    // Get active sprint on the board
    let active = null;
    try {
      const sprintData = await jiraGet(`/rest/agile/1.0/board/${boardId}/sprint?state=active&maxResults=5`);
      active = sprintData.values?.[0];
    } catch (err) {
      // Board might be Kanban (doesn't support sprints), continue to fallback
      console.warn("Board does not support sprints (likely Kanban board):", err.message);
    }
    
    if (active) {
      // Fetch from active sprint
      try {
        const issues = await paginateIssues(
          (s, max) => `/rest/agile/1.0/sprint/${active.id}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
        );
        if (issues.length > 0) {
          let tickets = issues.map(mapIssue);
          
          // Optional date range filtering (in memory)
          if (startDate || endDate) {
            tickets = tickets.filter(t => {
              if (startDate && t.created && t.created < startDate) return false;
              if (endDate && t.created && t.created > endDate) return false;
              return true;
            });
          }
          
          return tickets;
        }
      } catch (err) {
        console.warn("Could not fetch from active sprint:", err.message);
      }
    }

    // Fallback 1: Try Kanban board endpoint (works for both Scrum and Kanban boards)
    try {
      const issues = await paginateIssues(
        (s, max) => `/rest/agile/1.0/board/${boardId}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
      );
      
      if (issues.length > 0) {
        let tickets = issues.map(mapIssue);
        
        // Optional date range filtering (in memory)
        if (startDate || endDate) {
          tickets = tickets.filter(t => {
            if (startDate && t.created && t.created < startDate) return false;
            if (endDate && t.created && t.created > endDate) return false;
            return true;
          });
        }
        
        return tickets;
      }
    } catch (err) {
      console.warn("Could not fetch from board endpoint:", err.message);
    }

    // Fallback 2: Use JQL search (only if we have a project key)
    if (projectKey) {
      try {
        const jql = `project = ${projectKey} ORDER BY created DESC`;
        const issues = await paginateIssues(
          (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=${max}&startAt=${s}`
        );
        
        if (issues.length > 0) {
          let tickets = issues.map(mapIssue);
          
          // Optional date range filtering (in memory)
          if (startDate || endDate) {
            tickets = tickets.filter(t => {
              if (startDate && t.created && t.created < startDate) return false;
              if (endDate && t.created && t.created > endDate) return false;
              return true;
            });
          }
          
          return tickets;
        }
      } catch (err) {
        console.error("Error fetching milestone tickets via JQL:", err);
      }
    }
  } catch (err) {
    console.error("Error fetching milestones from board:", err);
  }

  return [];
}

/**
 * Get unique team names from a list of tickets
 * @param {Array} tickets - Array of mapped ticket objects
 * @returns {Array} Array of unique team names, sorted alphabetically
 */
export function getUniqueTeams(tickets) {
  const teams = new Set();
  for (const ticket of tickets) {
    if (ticket.team) {
      teams.add(ticket.team);
    }
  }
  return Array.from(teams).sort();
}

/**
 * Get unique milestone names (labels) from a list of tickets
 * @param {Array} tickets - Array of mapped ticket objects
 * @returns {Array} Array of unique milestone names
 */
export function getUniqueMilestones(tickets) {
  const milestones = new Set();
  for (const ticket of tickets) {
    if (ticket.milestone && ticket.milestone !== "Unassigned") {
      milestones.add(ticket.milestone);
    }
  }
  return Array.from(milestones).sort();
}

/**
 * Compute milestone statistics from tickets
 * @param {Array} tickets - Array of mapped ticket objects
 * @returns {Object} Map of milestone name -> statistics
 */
export function computeMilestoneStats(tickets) {
  const milestoneMap = {};
  const today = new Date();

  for (const t of tickets) {
    const name = t.milestone ?? "Unassigned";
    if (!milestoneMap[name]) {
      milestoneMap[name] = {
        name,
        tickets: [],
        totalCount: 0,
        doneCount: 0,
        totalSP: 0,
        doneSP: 0,
        deadlineDate: null, // max end date of all tickets in milestone
        statusCounts: {},
        createdDates: [], // track all creation dates
      };
    }

    milestoneMap[name].tickets.push(t);
    milestoneMap[name].totalCount += 1;
    if ((t.status ?? "").toLowerCase() === "done") milestoneMap[name].doneCount += 1;

    const sp = Number.isFinite(t.sp) ? t.sp : 0;
    milestoneMap[name].totalSP += sp;
    if ((t.status ?? "").toLowerCase() === "done") milestoneMap[name].doneSP += sp;

    milestoneMap[name].statusCounts[t.status ?? "Unknown"] = 
      (milestoneMap[name].statusCounts[t.status ?? "Unknown"] ?? 0) + 1;

    // Track deadline (max end date) and created dates
    if (t.endDate && (!milestoneMap[name].deadlineDate || t.endDate > milestoneMap[name].deadlineDate)) {
      milestoneMap[name].deadlineDate = t.endDate;
    }
    if (t.created) {
      milestoneMap[name].createdDates.push(t.created);
    }
  }

  // Convert to array and add computed fields
  const allMilestones = Object.values(milestoneMap)
    .map((m) => {
      let daysLeft = null, daysOverdue = null;
      if (m.deadlineDate) {
        const deadline = new Date(m.deadlineDate);
        if (today > deadline) daysOverdue = Math.round((today - deadline) / 86400000);
        else daysLeft = Math.max(0, Math.round((deadline - today) / 86400000));
      }
      
      const completionPct = m.totalCount > 0 ? Math.round((m.doneCount / m.totalCount) * 100) : 0;
      
      // Review date = max end date (last ticket completion date)
      const reviewDate = m.deadlineDate;
      
      return {
        ...m,
        daysLeft,
        daysOverdue,
        completionPct,
        reviewDate,
      };
    })
    .sort((a, b) => {
      if (a.deadlineDate && b.deadlineDate) return a.deadlineDate.localeCompare(b.deadlineDate);
      if (a.deadlineDate) return -1;
      if (b.deadlineDate) return 1;
      return 0;
    });

  return { milestoneMap, allMilestones };
}
