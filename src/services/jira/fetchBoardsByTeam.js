import { jiraGet, paginateIssues } from "./jiraClient.js";
import { buildIssueFields } from "./buildFields.js";
import { FIELD_TEAM } from "./jiraConfig.js";

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

/**
 * Fetch all epics for a given board using the Jira Agile API.
 * Returns objects with { id, key, name } sorted by name.
 * @param {string} boardId
 * @returns {Promise<Array<{id: string, key: string, name: string}>>}
 */
export async function fetchBoardEpics(boardId, projectKey = null) {
  if (!boardId && !projectKey) return [];

  const PAGE = 50;
  const epics = [];

  if (boardId) {
    try {
      let startAt = 0;
      for (;;) {
        const data = await jiraGet(
          `/rest/agile/1.0/board/${boardId}/epic?maxResults=${PAGE}&startAt=${startAt}&done=false`
        );
        const values = data?.values ?? [];
        for (const e of values) {
          epics.push({ id: String(e.id), key: e.key, name: e.name || e.summary || e.key });
        }
        if (values.length < PAGE) break;
        startAt += PAGE;
      }
    } catch (err) {
      // Agile epic endpoint returns 404 for boards without epics, or 400/403 for
      // team-managed (simple) boards — fall through to JQL fallback below.
      if (!String(err.message).includes("404") && !String(err.message).includes("400") && !String(err.message).includes("403")) {
        console.error("Error fetching board epics:", err);
      }
    }
  }

  // JQL fallback: used for team-managed boards AND direct projectKey lookups (team mode).
  if (epics.length === 0 && projectKey) {
    try {
      const jql = `project = "${projectKey}" AND issuetype = Epic ORDER BY summary ASC`;
      const issues = await paginateIssues(
        (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,key&maxResults=${max}&startAt=${s}`
      );
      for (const e of issues) {
        epics.push({ id: String(e.id), key: e.key, name: e.fields?.summary || e.key });
      }
    } catch (err) {
      console.warn("JQL epic fallback failed:", err);
    }
  }

  return epics.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch all unique labels from issues that belong to a specific epic.
 * Uses /rest/agile/1.0/board/{boardId}/epic/{epicId}/issue
 * @param {string} boardId
 * @param {string} epicId   - numeric epic ID (from fetchBoardEpics)
 * @returns {Promise<string[]>}
 */
export async function fetchLabelsByEpic(boardId, epicId, epicKey = null, projectKey = null) {
  if (!boardId || !epicId) return [];

  const fields = buildIssueFields(false);
  const labelSet = new Set();
  let usedAgile = false;

  try {
    const issues = await paginateIssues(
      (s, max) =>
        `/rest/agile/1.0/board/${boardId}/epic/${epicId}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
    );
    for (const issue of issues) {
      for (const label of issue.fields?.labels ?? []) {
        if (label && typeof label === "string") labelSet.add(label);
      }
    }
    usedAgile = true;
  } catch (err) {
    // team-managed boards don't support the agile epic/issue endpoint
    if (!String(err.message).includes("404") && !String(err.message).includes("400") && !String(err.message).includes("403")) {
      console.error("Error fetching labels for epic:", err);
    }
  }

  // JQL fallback for team-managed boards: child issues use `parent = epicKey`
  if (!usedAgile || labelSet.size === 0) {
    if (epicKey) {
      try {
        const jql = `parent = "${epicKey}"${projectKey ? ` AND project = "${projectKey}"` : ""}`;
        const issues = await paginateIssues(
          (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=labels&maxResults=${max}&startAt=${s}`
        );
        for (const issue of issues) {
          for (const label of issue.fields?.labels ?? []) {
            if (label && typeof label === "string") labelSet.add(label);
          }
        }
      } catch (err) {
        console.warn("JQL label fallback failed:", err);
      }
    }
  }

  return Array.from(labelSet).sort();
}

/**
 * Search Atlassian organizational teams by name using Jira's JQL autocomplete.
 * Returns { id (ARI string), name } pairs ready for a combobox.
 * @param {string} query
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
/** Strip HTML tags that Jira embeds in autocomplete displayName strings. */
function stripHtml(str) {
  return str ? str.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";
}

export async function fetchTeamSuggestions(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const data = await jiraGet(
      `/rest/api/3/jql/autocompletedata/suggestions?fieldName=team&fieldValue=${encodeURIComponent(query.trim())}`
    );
    return (data?.results ?? []).map(r => ({ id: r.value, name: stripHtml(r.displayName) }));
  } catch {
    return [];
  }
}

/**
 * Fetch all Jira issues whose "Team" field matches the given Atlassian team.
 * Tries multiple JQL strategies because the `team = ARI` JQL returns 410 on
 * some Jira Cloud instances.  Falls back to querying by team-member account IDs.
 * @param {string} teamAri   e.g. "ari:cloud:identity::team/uuid" or bare UUID
 * @param {string} teamName  display name for cf-by-name fallback
 * @returns {Promise<Array>} raw Jira issue objects
 */
export async function fetchIssuesByAtlassianTeam(teamAri, teamName = null) {
  if (!teamAri) return null;

  const fields  = buildIssueFields(false);
  const fieldNum = FIELD_TEAM.replace("customfield_", "");

  // Extract UUID from ARI: "ari:cloud:identity::team/{uuid}" → uuid
  const uuidMatch = teamAri.match(/\/([^/]+)$/);
  const teamUuid  = uuidMatch ? uuidMatch[1] : teamAri;

  // Fast-probe: one cheap request to check if JQL team filtering works at all.
  // jiraGet returns {__isGone:true} for 410 — if we get that, skip all JQL.
  const probe = await jiraGet(
    `/rest/api/3/search?jql=${encodeURIComponent(`team = "${teamUuid}"`)}&maxResults=1&fields=key&startAt=0`
  ).catch(() => ({ __isGone: true }));
  if (probe?.__isGone) {
    return null; // JQL team field unsupported on this instance — use board-scan
  }

  // JQL works — run full paginated query
  const tryJql = async (jql) => {
    try {
      return await paginateIssues(
        (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=${max}&startAt=${s}`
      );
    } catch { return []; }
  };

  let issues = await tryJql(`team = "${teamAri}" ORDER BY created DESC`);
  if (issues.length > 0) return issues;

  issues = await tryJql(`cf[${fieldNum}] = "${teamAri}" ORDER BY created DESC`);
  if (issues.length > 0) return issues;

  if (teamUuid !== teamAri) {
    issues = await tryJql(`cf[${fieldNum}] = "${teamUuid}" ORDER BY created DESC`);
    if (issues.length > 0) return issues;
  }

  if (teamName) {
    issues = await tryJql(`cf[${fieldNum}] = "${teamName}" ORDER BY created DESC`);
    if (issues.length > 0) return issues;
  }

  return null; // exhausted — fall back to board-scan
}

/**
 * Fallback when JQL team filtering is unsupported (returns 410).
 * Fetches all issues from the provided board IDs via the Agile API and
 * filters locally by the FIELD_TEAM custom field value.
 * @param {string[]} boardIds
 * @param {string}   teamAri   full ARI or bare UUID
 * @param {string}   teamName  display name
 * @returns {Promise<Array>}   raw Jira issue objects matching the team
 */
export async function fetchIssuesByBoardsFilteredByTeam(boardIds, teamAri, teamName) {
  if (!boardIds?.length) return [];

  const fields  = buildIssueFields(false);
  const uuidMatch = teamAri?.match(/\/([^/]+)$/);
  const teamUuid  = uuidMatch ? uuidMatch[1] : teamAri;

  // Local matcher: checks all possible representations of the team field.
  // Jira stores Atlassian teams as full ARIs (ari:cloud:identity::team/UUID)
  // but the autocomplete API returns just the UUID — so we match by substring too.
  const checkStr = (val) => {
    if (!val) return false;
    const v = String(val).toLowerCase();
    return v === teamAri.toLowerCase() ||
           v === teamUuid.toLowerCase() ||
           v.includes(teamUuid.toLowerCase()) ||
           (teamName ? v === teamName.toLowerCase() : false);
  };
  const matchesTeam = (raw) => {
    const tf = raw.fields?.[FIELD_TEAM];
    if (!tf) return false;
    if (typeof tf === "string")  return checkStr(tf);
    if (Array.isArray(tf))       return tf.some(t => checkStr(t) || checkStr(t?.id) || checkStr(t?.name) || checkStr(t?.title));
    return checkStr(tf.id) || checkStr(tf.name) || checkStr(tf.title) || checkStr(String(tf));
  };

  // Fetch boards in parallel batches of 4 to avoid flooding
  const BATCH = 4;
  const seen  = new Set();
  const result = [];

  for (let i = 0; i < boardIds.length; i += BATCH) {
    const batch = boardIds.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(id =>
        paginateIssues(
          (s, max) =>
            `/rest/agile/1.0/board/${id}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
        )
      )
    );
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const issue of r.value) {
        if (!seen.has(issue.key) && matchesTeam(issue)) {
          seen.add(issue.key);
          result.push(issue);
        }
      }
    }
  }

  return result;
}

/**
 * Search epics by name or key across all Jira projects.
 *
 * Strategy order:
 *  1. Extract issue key from a full Jira URL or bare key → direct /issue/{key} lookup (no JQL)
 *  2. Sanitised JQL summary/text search (may return 410 on some instances — silently skipped)
 *  3. Board-scan fallback: iterate provided boardIds via the Agile epics endpoint and filter
 *     client-side. Always works regardless of JQL restrictions.
 *
 * @param {string}   query
 * @param {string[]} fallbackBoardIds - board IDs to scan when JQL is unavailable
 * @returns {Promise<Array<{id: string, key: string, name: string}>>}
 */
export async function searchEpicsGlobally(query, fallbackBoardIds = []) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const toEpic = (e) => ({ id: String(e.id), key: e.key, name: e.fields?.summary || e.key });

  // ── Strategy 1: URL or bare key → direct REST lookup (no JQL at all) ────────
  // Accepts:  https://company.atlassian.net/browse/TR-34399
  //           TR-34399
  const keyMatch = q.match(/\/browse\/([A-Z][A-Z0-9_]+-\d+)/i) || q.match(/^([A-Z][A-Z0-9_]+-\d+)$/i);
  if (keyMatch) {
    const key = keyMatch[1].toUpperCase();
    try {
      const data = await jiraGet(`/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,key,issuetype`);
      if (data && !data.__isGone) {
        const typeName = (data.fields?.issuetype?.name ?? "").toLowerCase();
        // Return even if not typed as "Epic" — user may intentionally look up any issue
        if (typeName === "epic") return [toEpic(data)];
        // Not an epic — let the user know via empty (don't fall through to text search)
        return [];
      }
    } catch { /* fall through */ }
    // If the input was a URL we don't want to pass the whole URL into JQL
    if (q.includes("://")) return [];
  }

  // ── Strategy 2: JQL text search (sanitise first, silently skip on 410) ───────
  // Hyphens tokenise in Jira's Lucene engine; replace with spaces for better recall.
  const sanitized = q
    .replace(/https?:\/\/\S+/g, "")   // strip any URLs
    .replace(/-/g, " ")                // hyphen → space
    .replace(/[^\w\s]/g, " ")          // remove remaining special chars
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ");

  const jqlResults = [];
  if (sanitized.length >= 2) {
    const safe = sanitized.replace(/"/g, '\\"');
    const runJql = async (jql) => {
      try {
        const issues = await paginateIssues(
          (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,key&maxResults=50&startAt=${s}`
        );
        return issues.map(toEpic);
      } catch { return []; }
    };
    const [r1, r2] = await Promise.all([
      runJql(`issuetype = Epic AND summary ~ "${safe}" ORDER BY summary ASC`),
      runJql(`issuetype = Epic AND text ~ "${safe}" ORDER BY summary ASC`),
    ]);
    jqlResults.push(...r1, ...r2);
  }

  if (jqlResults.length > 0) {
    const seen = new Set();
    return jqlResults.filter(e => { if (seen.has(e.key)) return false; seen.add(e.key); return true; });
  }

  // ── Strategy 3: Board-scan fallback — works when JQL returns 410 ─────────────
  if (fallbackBoardIds.length === 0) return [];

  const needle = (sanitized || q.replace(/-/g, " ")).toLowerCase();
  const epicMap = new Map();

  await Promise.allSettled(
    fallbackBoardIds.map(bid => fetchBoardEpics(String(bid), null))
  ).then(results => {
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const e of r.value) {
        if (!epicMap.has(e.key) && e.name.toLowerCase().includes(needle)) {
          epicMap.set(e.key, e);
        }
      }
    }
  });

  return [...epicMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch all issues under an epic globally (no board restriction).
 * Tries "Epic Link" JQL (classic projects) then parent= (next-gen).
 * @param {string} epicKey - e.g. "PROJ-123"
 * @returns {Promise<Array>} raw Jira issue objects
 */
/**
 * @param {string}   epicKey          - e.g. "ATM-68"
 * @param {string}   epicId           - numeric Jira ID (for Agile endpoint)
 * @param {string[]} fallbackBoardIds - all pre-loaded board IDs
 */
export async function fetchIssuesByEpicGlobal(epicKey, epicId = null, fallbackBoardIds = []) {
  if (!epicKey) return [];
  const fields = buildIssueFields(false);

  // ── Strategy 1: Classic "Epic Link" JQL ──────────────────────────────────────
  try {
    const issues = await paginateIssues(
      (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(`"Epic Link" = ${epicKey} ORDER BY created DESC`)}&fields=${fields}&maxResults=${max}&startAt=${s}`
    );
    if (issues.length > 0) return issues;
  } catch { /* ignore */ }

  // ── Strategy 2: Next-gen parent= JQL ─────────────────────────────────────────
  try {
    const issues = await paginateIssues(
      (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(`parent = ${epicKey} ORDER BY created DESC`)}&fields=${fields}&maxResults=${max}&startAt=${s}`
    );
    if (issues.length > 0) return issues;
  } catch { /* ignore */ }

  // ── Strategy 3: Agile /board/{id}/epic/{epicId}/issue ────────────────────────
  // This endpoint is specifically designed for this purpose and works across
  // cross-project epics — child issues from ANY project are returned as long as
  // they live on that board. Scan all available boards.
  if (epicId) {
    const epicBoardIds = [...new Set([
      // Also try boards for the epic's own project
      ...(await (async () => {
        try {
          const projectKey = epicKey.replace(/-\d+$/, "");
          const data = await jiraGet(`/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&maxResults=10`);
          return (data?.values ?? []).map(b => String(b.id));
        } catch { return []; }
      })()),
      ...fallbackBoardIds.map(String),
    ])];

    const seen = new Set();
    const result = [];
    const BATCH = 4;

    for (let i = 0; i < epicBoardIds.length; i += BATCH) {
      const batch = epicBoardIds.slice(i, i + BATCH);
      const settled = await Promise.allSettled(
        batch.map(bid =>
          paginateIssues(
            (s, max) =>
              `/rest/agile/1.0/board/${bid}/epic/${epicId}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
          )
        )
      );
      for (const r of settled) {
        if (r.status !== "fulfilled") continue;
        for (const issue of r.value) {
          if (!seen.has(issue.key)) { seen.add(issue.key); result.push(issue); }
        }
      }
    }
    if (result.length > 0) return result;
  }

  // ── Strategy 4: Full board-scan with local parent/epic-link filter ───────────
  // Last resort: fetch every issue on every board and filter client-side.
  // Covers cross-project epics where children live on a different project's board.
  // Checks parent.key (next-gen) and any customfield that equals the epic key
  // (classic Epic Link, which varies by instance).
  const isEpicChild = (issue) => {
    if (!issue?.fields) return false;
    if (issue.fields.parent?.key === epicKey) return true;
    // Check every customfield value — the Epic Link field ID varies by instance
    for (const [k, v] of Object.entries(issue.fields)) {
      if (!k.startsWith("customfield_")) continue;
      if (v === epicKey) return true;
    }
    return false;
  };

  // Collect all boards: epic's project boards + all fallback boards
  const projectKey = epicKey.replace(/-\d+$/, "");
  let projectBoardIds = [];
  try {
    const data = await jiraGet(`/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&maxResults=10`);
    projectBoardIds = (data?.values ?? []).map(b => String(b.id));
  } catch { /* ignore */ }

  const allBoardIds = [...new Set([...projectBoardIds, ...fallbackBoardIds.map(String)])];
  if (allBoardIds.length === 0) return [];

  const seen2 = new Set();
  const result2 = [];
  const BATCH2 = 4;

  for (let i = 0; i < allBoardIds.length; i += BATCH2) {
    const batch = allBoardIds.slice(i, i + BATCH2);
    const settled = await Promise.allSettled(
      batch.map(bid =>
        paginateIssues(
          (s, max) => `/rest/agile/1.0/board/${bid}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
        )
      )
    );
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const issue of r.value) {
        if (!seen2.has(issue.key) && isEpicChild(issue)) {
          seen2.add(issue.key);
          result2.push(issue);
        }
      }
    }
    // Don't break early — child issues can be on ANY board (cross-project epics)
  }

  return result2;
}
