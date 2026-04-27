import { jiraGet, paginateIssues } from "./jiraClient.js";
import { buildIssueFields } from "./buildFields.js";

/**
 * Fetch all boards filtered by project location (team)
 * @param {string} projectLocation - The project location ID to filter by (e.g., "10108")
 * @returns {Promise<Array>} Array of board objects with id, name, type, projectKey
 */
export async function fetchBoardsByTeam(projectLocation = null) {
  const PAGE = 50;
  let allValues = [];

  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.set("maxResults", PAGE);
    params.set("startAt", 0);
    if (projectLocation) {
      params.set("projectLocation", projectLocation);
    }

    const firstPage = await jiraGet(`/rest/agile/1.0/board?${params.toString()}`);
    const total = typeof firstPage.total === "number" ? firstPage.total : null;
    allValues = [...(firstPage.values ?? [])];

    if (total && total > PAGE) {
      const startAts = [];
      for (let s = PAGE; s < total; s += PAGE) startAts.push(s);
      
      const pages = await Promise.allSettled(
        startAts.map((s) => {
          const p = new URLSearchParams();
          p.set("maxResults", PAGE);
          p.set("startAt", s);
          if (projectLocation) {
            p.set("projectLocation", projectLocation);
          }
          return jiraGet(`/rest/agile/1.0/board?${p.toString()}`);
        })
      );
      
      for (const p of pages) {
        if (p.status === "fulfilled") allValues.push(...(p.value?.values ?? []));
      }
    } else if (!total) {
      let startAt = PAGE;
      for (;;) {
        const p = new URLSearchParams();
        p.set("maxResults", PAGE);
        p.set("startAt", startAt);
        if (projectLocation) {
          p.set("projectLocation", projectLocation);
        }
        
        let data;
        try {
          data = await jiraGet(`/rest/agile/1.0/board?${p.toString()}`);
        } catch {
          break;
        }
        
        const vals = data.values ?? [];
        if (vals.length === 0) break;
        allValues.push(...vals);
        startAt += PAGE;
        if (vals.length < PAGE) break;
      }
    }
  } catch (err) {
    console.error("Error fetching boards by team:", err);
    return [];
  }

  // Deduplicate and map
  const seen = new Set();
  const boards = allValues
    .filter((b) => { if (seen.has(b.id)) return false; seen.add(b.id); return true; })
    .map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      projectKey: b.location?.projectKey ?? null,
      projectName: b.location?.projectName ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return boards;
}

/**
 * Fetch all unique labels from a board's issues
 * @param {string} boardId - The Jira board ID
 * @returns {Promise<Array>} Array of label strings, sorted
 */
export async function fetchBoardLabels(boardId) {
  if (!boardId) {
    console.warn("No board ID provided - cannot fetch labels");
    return [];
  }

  const fields = buildIssueFields(false);
  const labels = new Set();

  try {
    // Fetch issues from board (paginated)
    const issues = await paginateIssues(
      (s, max) => `/rest/agile/1.0/board/${boardId}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
    );

    // Extract labels from each issue
    for (const issue of issues) {
      const issueLabels = issue.fields?.labels ?? [];
      for (const label of issueLabels) {
        if (label && typeof label === "string") {
          labels.add(label);
        }
      }
    }
  } catch (err) {
    console.error("Error fetching board labels:", err);
  }

  return Array.from(labels).sort();
}

/**
 * Fetch all issues from a board that match given labels
 * @param {string} boardId - The Jira board ID
 * @param {string} projectKey - The project key (e.g., "ABC")
 * @param {Array<string>} selectedLabels - Array of label names to filter by
 * @returns {Promise<Array>} Array of issues with the selected labels
 */
export async function fetchIssuesByLabels(boardId, projectKey, selectedLabels = []) {
  if (!boardId || !selectedLabels || selectedLabels.length === 0) {
    return [];
  }

  const fields = buildIssueFields(false);

  try {
    // Use Agile API directly — JQL search returns 410 on this Jira instance.
    // Fetch all board issues and filter locally by label.
    let allBoardIssues;
    try {
      allBoardIssues = await paginateIssues(
        (s, max) => `/rest/agile/1.0/board/${boardId}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
      );
    } catch (agileErr) {
      // Agile API failed, fall back to project JQL
      if (projectKey) {
        allBoardIssues = await paginateIssues(
          (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(`project = ${projectKey} ORDER BY created DESC`)}&fields=${fields}&maxResults=${max}&startAt=${s}`
        );
      } else {
        return [];
      }
    }

    // Filter to only issues that have ANY of the selected labels (OR logic)
    return allBoardIssues.filter((issue) => {
      const issueLabels = (issue.fields?.labels ?? []).map(l => l.toLowerCase());
      return selectedLabels.some(label => issueLabels.includes(label.toLowerCase()));
    });
  } catch (err) {
    console.error("Error fetching issues by labels:", err);
    return [];
  }
}
