/**
 * jira.js — Jira Cloud REST API v3 integration
 *
 * Env vars required (in .env):
 *   VITE_JIRA_BASE_URL   e.g. https://yourcompany.atlassian.net
 *   VITE_JIRA_EMAIL      your Atlassian account email
 *   VITE_JIRA_API_TOKEN  Atlassian API token (profile → security → API tokens)
 *
 * Custom Jira fields (optional — configure to match your project):
 *   VITE_JIRA_FIELD_TL_COMMENT      e.g. customfield_10100
 *   VITE_JIRA_FIELD_REVIEW_RATING   e.g. customfield_10101
 *   VITE_JIRA_FIELD_ARTIFACTS       e.g. customfield_10102
 *
 * The proxy in vite.config.js rewrites /jira-api/* → VITE_JIRA_BASE_URL/*
 * to avoid CORS restrictions in the browser.
 */

const BASE    = "/jira-api";
const EMAIL   = import.meta.env.VITE_JIRA_EMAIL    ?? "";
const TOKEN   = import.meta.env.VITE_JIRA_API_TOKEN ?? "";

// Custom field IDs — override via .env if your project uses different ones
const FIELD_TL_COMMENT    = import.meta.env.VITE_JIRA_FIELD_TL_COMMENT    ?? "customfield_10100";
const FIELD_REVIEW_RATING = import.meta.env.VITE_JIRA_FIELD_REVIEW_RATING ?? "customfield_10101";
const FIELD_ARTIFACTS     = import.meta.env.VITE_JIRA_FIELD_ARTIFACTS     ?? "customfield_10102";
// Story Points — env override wins; otherwise auto-detected at runtime from /rest/api/3/field
const FIELD_STORY_POINTS_ENV = import.meta.env.VITE_JIRA_FIELD_STORY_POINTS ?? null;

// Known fallback candidate IDs (broadest list across Jira Cloud/Server/DC)
const SP_CANDIDATES = [
  "customfield_10016", // classic & team-managed Cloud (most common)
  "customfield_10028", // next-gen team-managed
  "customfield_10014", // older Jira Server
  "customfield_10024",
  "customfield_10034",
  "customfield_10004", // some DC installs
  "customfield_10008", // some DC installs
];

// Detected once per session via /rest/api/3/field
let _detectedSpFieldId = FIELD_STORY_POINTS_ENV;
let _spDetectionDone   = !!FIELD_STORY_POINTS_ENV;

// Fetch field metadata once to find the authoritative SP field ID
async function detectStoryPointsField() {
  if (_spDetectionDone) return;
  _spDetectionDone = true;
  try {
    const allFields = await jiraGet("/rest/api/3/field");
    if (!Array.isArray(allFields)) return;
    const SP_NAMES = [
      "story points", "story point estimate", "story point",
      "story points estimate", "estimate", "sp",
    ];
    const match = allFields.find(
      (fld) => SP_NAMES.includes((fld.name ?? "").toLowerCase()) && fld.schema?.type === "number"
    ) ?? allFields.find(
      (fld) => SP_NAMES.includes((fld.name ?? "").toLowerCase())
    );
    if (match?.id) _detectedSpFieldId = match.id;
  } catch { /* fall through — use candidate list */ }
}

// Safe numeric conversion — returns null instead of NaN
function safeNum(v) {
  if (v == null) return null;
  const n = typeof v === "object" ? Number(v?.value ?? v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Format seconds → "2073h 1m" (raw hours + minutes, matching Tempo's display)
function fmtTimeSpent(seconds) {
  if (!seconds || seconds <= 0) return "";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.length ? parts.join(" ") : "< 1m";
}

function authHeader() {
  const creds = btoa(`${EMAIL}:${TOKEN}`);
  return { Authorization: `Basic ${creds}`, "Content-Type": "application/json" };
}

async function jiraGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeader() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jira ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/* ── Map a raw Jira issue to our normalised ticket shape ─────────────── */
function mapIssue(raw) {
  const f = raw.fields;

  // Dates: Jira uses sprint start/end or created/updated as fallback
  const startDate =
    f.customfield_10020?.[0]?.startDate   // active sprint start
    ?? f.created?.slice(0, 10)
    ?? null;

  const endDate =
    f.customfield_10020?.[0]?.endDate     // active sprint end
    ?? f.duedate
    ?? f.updated?.slice(0, 10)
    ?? null;

  // Sprint name
  const sprintName =
    f.customfield_10020?.[0]?.name ?? null;

  // Story points — try env-configured field first, then all common Jira SP field IDs:
  //   customfield_10016 — classic & team-managed projects (most common)
  //   customfield_10028 — next-gen / team-managed (some instances)
  //   customfield_10014 — older Jira Server installs
  //   customfield_10024 / 10034 — seen in various enterprise configs
  // Prefer the auto-detected/env-configured field; fall through the candidate list
  let spRaw = null;
  const spFieldList = [
    ...(_detectedSpFieldId ? [_detectedSpFieldId] : []),
    ...SP_CANDIDATES,
  ];
  for (const fId of spFieldList) {
    const v = safeNum(f[fId]);
    if (v !== null) { spRaw = v; break; }
  }

  // Assignee
  const assigneeName = f.assignee?.displayName ?? "Unassigned";
  const assigneeAvatar = f.assignee?.avatarUrls?.["48x48"] ?? null;
  const assigneeEmail  = f.assignee?.emailAddress ?? null;

  // Status category → our label
  const rawStatus = f.status?.name ?? "To Do";

  // Priority
  const priority = f.priority?.name ?? null;

  // Labels & components
  const labels     = f.labels ?? [];
  const components = (f.components ?? []).map((c) => c.name);

  // Custom fields
  const tlComment    = f[FIELD_TL_COMMENT]    ?? null;
  const reviewRating = f[FIELD_REVIEW_RATING] != null
    ? Number(f[FIELD_REVIEW_RATING])
    : null;
  const artifacts    = f[FIELD_ARTIFACTS]     ?? null;

  // Description (Atlassian Document Format → plain text)
  const description = f.summary ?? "";
  const descriptionBody = adfToText(f.description);

  return {
    id:            raw.key,
    description,
    descriptionBody,
    status:        rawStatus,
    sp:            spRaw,
    assigneeName,
    assigneeAvatar,
    assigneeEmail,
    startDate,
    endDate,
    sprintName,
    priority,
    labels,
    components,
    tlComment,
    reviewRating,
    artifacts,
    issueType:     f.issuetype?.name ?? null,
    issueTypeIcon: f.issuetype?.iconUrl ?? null,
    reporter:      f.reporter?.displayName ?? null,
    created:       f.created?.slice(0, 10) ?? null,
    updated:       f.updated?.slice(0, 10) ?? null,
    numericId:     raw.id ?? null,   // numeric ID needed for dev-status API
    jiraUrl: `${import.meta.env.VITE_JIRA_BASE_URL ?? ""}/browse/${raw.key}`,
    // aggregatetimespent sums time on this issue + all child issues (epics, stories with subtasks)
    // Falls back to timespent (direct logs only) when aggregate is unavailable
    timeSpent:     fmtTimeSpent(f.aggregatetimespent ?? f.timespent ?? null),
  };
}

/* ── Atlassian Document Format → plain text ─────────────────────────── */
function adfToText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) {
    return node.content.map(adfToText).join(
      node.type === "paragraph" || node.type === "heading" ? "\n" : ""
    );
  }
  return "";
}

/* ── Fetch a single ticket by key ───────────────────────────────────── */
export async function fetchTicket(key) {
  await detectStoryPointsField();
  const spFields = [
    ...(_detectedSpFieldId ? [_detectedSpFieldId] : []),
    ...SP_CANDIDATES,
  ];
  const fields = [
    "summary", "description", "status", "assignee", "reporter",
    "priority", "issuetype", "labels", "components",
    ...spFields,
    "customfield_10020",  // sprint
    "duedate", "created", "updated", "timespent", "aggregatetimespent",
    FIELD_TL_COMMENT, FIELD_REVIEW_RATING, FIELD_ARTIFACTS,
  ].join(",");

  const data = await jiraGet(`/rest/api/3/issue/${key}?fields=${fields}`);
  return mapIssue(data);
}

/* ── Fetch linked pull requests via Jira development info ───────────── *
 * Known applicationType values:                                          *
 *   bitbucket        – Bitbucket Cloud                                   *
 *   stash            – Bitbucket Server / Data Center  (← most common)   *
 *   github           – GitHub Cloud                                       *
 *   github-enterprise– GitHub Enterprise                                  *
 *   gitlab           – GitLab                                             *
 *                                                                         *
 * We try ALL known types in parallel across BOTH known API path versions  *
 * so results appear regardless of SCM or Jira version.                   */
export async function fetchPullRequests(numericId) {
  if (!numericId) return [];

  // Only try the two Bitbucket variants (stash = Bitbucket Server/DC, bitbucket = Cloud)
  // All calls are made in parallel; non-matching app types return empty arrays quickly.
  const appTypes = ["stash", "bitbucket", "github", "github-enterprise", "gitlab"];
  // Only need /1.0/ for Jira Cloud; skip /latest/ to halve the request count
  const apiPaths = ["/rest/dev-status/1.0"];

  const requests = [];
  for (const path of apiPaths) {
    for (const app of appTypes) {
      requests.push({ path, app,
        promise: jiraGet(
          `${path}/issue/detail?issueId=${numericId}&applicationType=${app}&dataType=pullrequest`
        )
      });
    }
  }

  const settled = await Promise.allSettled(requests.map((r) => r.promise));

  const seen   = new Set();
  const allPRs = [];

  settled.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    const prs = result.value?.detail?.[0]?.pullRequests ?? [];
    prs.forEach((pr) => {
      // Deduplicate by URL so the same PR doesn't appear twice from two path variants
      const key = pr.url ?? pr.id;
      if (seen.has(key)) return;
      seen.add(key);
      allPRs.push({
        id:     pr.url ?? `${requests[i].app}-${pr.id}`,
        name:   pr.name ?? `PR #${pr.id}`,
        url:    pr.url,
        status: pr.status,          // OPEN / MERGED / DECLINED
        author: pr.author?.name ?? pr.author?.displayName ?? null,
        repo:   pr.destination?.repository?.name
                ?? pr.source?.repository?.name
                ?? null,
        source: requests[i].app,
      });
    });
  });

  return allPRs;
}

/* ── Parallel-fetch PR URLs for all sprint tickets (used by Excel export) ─
 * Fires all ticket PR requests concurrently — no batching.
 * Returns a Map<ticketKey, string[]> of PR URLs per ticket.            */
export async function fetchAllPRsForTickets(tickets) {
  const results = await Promise.allSettled(
    tickets.map(async (t) => {
      const prs = await fetchPullRequests(t.numericId);
      return { id: t.id, urls: prs.map((p) => p.url).filter(Boolean) };
    })
  );
  const map = new Map();
  results.forEach((r) => {
    if (r.status === "fulfilled") map.set(r.value.id, r.value.urls);
  });
  return map;
}

/* ── Fetch the issue id (numeric) needed for dev-status ─────────────── */
/* isJiraConfigured — returns true when all 3 required env vars are set */
export function isJiraConfigured() {
  return !!(import.meta.env.VITE_JIRA_BASE_URL && EMAIL && TOKEN);
}

/* ── Fetch sprint issues using three strategies ──────────────────────
 *
 * Strategy 1 (most reliable): Agile REST API — requires sprint ID
 *   /rest/agile/1.0/sprint/{id}/issue                                   *
 * Strategy 2: Board API — auto-detects active sprint from board ID
 *   /rest/agile/1.0/board/{boardId}/sprint?state=active                 *
 * Strategy 3: JQL fallback — uses sprint in openSprints()               *
 *                                                                        *
 * sprintIdOverride lets the app switch sprints without reloading env.   */
export async function fetchSprintTickets(sprintIdOverride = null) {
  const projectKey = import.meta.env.VITE_JIRA_PROJECT_KEY ?? "";
  const envSprintId = import.meta.env.VITE_JIRA_SPRINT_ID  ?? "";
  const boardId    = import.meta.env.VITE_JIRA_BOARD_ID    ?? "";
  const sprintId   = sprintIdOverride ?? envSprintId;

  await detectStoryPointsField();
  const spFields = [
    ...(_detectedSpFieldId ? [_detectedSpFieldId] : []),
    ...SP_CANDIDATES,
  ];
  const fields = [
    "summary", "status", "assignee",
    ...spFields,
    "customfield_10020",  // sprint info
    "priority", "issuetype", "reporter",
    "labels", "components",
    "duedate", "created", "updated", "timespent", "aggregatetimespent",
    FIELD_TL_COMMENT, FIELD_REVIEW_RATING, FIELD_ARTIFACTS,
  ].join(",");

  // Helper: paginate a sprint/search issues endpoint until empty/short page
  async function paginateIssues(buildUrl) {
    const PAGE = 50;
    const BATCH = 5;
    const all = [];
    let startAt = 0;
    let done = false;
    while (!done) {
      const offsets = [];
      for (let i = 0; i < BATCH; i++) offsets.push(startAt + i * PAGE);
      const results = await Promise.allSettled(offsets.map((s) => jiraGet(buildUrl(s, PAGE))));
      for (const r of results) {
        if (done) break;
        if (r.status === "rejected") { done = true; break; }
        const issues = r.value?.issues ?? [];
        all.push(...issues);
        if (issues.length < PAGE) { done = true; }
      }
      startAt += BATCH * PAGE;
    }
    return all;
  }

  // Strategy 1a: Agile sprint issues API (reliable when sprint ID known)
  if (sprintId) {
    try {
      const issues = await paginateIssues(
        (s, max) => `/rest/agile/1.0/sprint/${sprintId}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
      );
      if (issues.length > 0) return issues.map(mapIssue);
    } catch { /* fall through */ }

    // Strategy 1b: JQL with explicit sprint ID
    try {
      const issues = await paginateIssues(
        (s, max) => `/rest/api/3/search?jql=${encodeURIComponent(`sprint = ${sprintId} ORDER BY created DESC`)}&fields=${fields}&maxResults=${max}&startAt=${s}`
      );
      if (issues.length > 0) return issues.map(mapIssue);
    } catch { /* fall through */ }
  }

  // Strategy 2: Board API — find active sprint, then fetch its issues
  if (boardId) {
    try {
      const sprintData = await jiraGet(
        `/rest/agile/1.0/board/${boardId}/sprint?state=active&maxResults=5`
      );
      const active = sprintData.values?.[0];
      if (active) {
        const issues = await paginateIssues(
          (s, max) => `/rest/agile/1.0/sprint/${active.id}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
        );
        if (issues.length > 0) return issues.map(mapIssue);
      }
    } catch { /* fall through */ }
  }

  // No sprint could be determined — user should select a board/sprint via the UI
  return [];
}
/* ── Fetch all issues for a kanban board (no sprint concept) ────────────
 *  Kanban boards don't have sprints — use the board's issue API instead.
 *  Paginates through all issues using startAt / total.                  */
export async function fetchKanbanTickets(boardId) {
  if (!boardId) return [];
  await detectStoryPointsField();
  const spFields = [
    ...(_detectedSpFieldId ? [_detectedSpFieldId] : []),
    ...SP_CANDIDATES,
  ];
  const fields = [
    "summary", "status", "assignee",
    ...spFields,
    "customfield_10020",
    "priority", "issuetype", "reporter",
    "labels", "components",
    "duedate", "created", "updated", "timespent", "aggregatetimespent",
    FIELD_TL_COMMENT, FIELD_REVIEW_RATING, FIELD_ARTIFACTS,
  ].join(",");

  // Use PAGE=50 — safe for Jira Cloud Agile board/issue endpoint.
  // IMPORTANT: Do NOT use `total` from the response as a stop condition —
  // Jira Cloud can return a capped/inaccurate total (e.g. 100) even when
  // hundreds more issues exist. The only reliable stop signal is receiving
  // fewer results than requested (genuine last page) or an empty page.
  const PAGE = 50;
  const BATCH = 5; // concurrent requests per round
  const allIssues = [];

  const fetchPage = (startAt) =>
    jiraGet(`/rest/agile/1.0/board/${boardId}/issue?fields=${fields}&maxResults=${PAGE}&startAt=${startAt}`);

  // Sequential batched pagination — fetch BATCH pages at a time,
  // stop when any page returns fewer than PAGE issues.
  let startAt = 0;
  let done = false;
  while (!done) {
    const offsets = [];
    for (let i = 0; i < BATCH; i++) offsets.push(startAt + i * PAGE);

    const results = await Promise.allSettled(offsets.map(fetchPage));

    for (const r of results) {
      if (done) break;
      if (r.status === "rejected") { done = true; break; }
      const issues = r.value?.issues ?? [];
      allIssues.push(...issues);
      if (issues.length < PAGE) { done = true; } // last page reached
    }
    startAt += BATCH * PAGE;
  }

  return allIssues.map(mapIssue);
}
/* ── Generic paginator for Jira Agile APIs (“values” + isLast / total) ────────
 *  Fetches pages until isLast, total exhausted, or a page errors.      *
 *  Always returns whatever it managed to collect.                       */
async function paginateAgile(buildUrl, pageSize = 50) {
  const results = [];
  let startAt = 0;
  let total = Infinity;
  for (;;) {
    let data;
    try {
      data = await jiraGet(buildUrl(startAt, pageSize));
    } catch {
      break; // stop paging but keep what we already have
    }
    const values = data.values ?? [];
    results.push(...values);
    // Update total from the response when available (most reliable stop signal)
    if (typeof data.total === "number") total = data.total;
    // Stop when: empty page, or we've collected all known items.
    // Only trust isLast when total is unknown — Jira can return isLast:true
    // on the first page even when more boards/sprints exist on subsequent pages.
    if (values.length === 0) break;
    if (results.length >= total) break;
    if (total === Infinity && data.isLast === true) break;
    startAt += pageSize;
  }
  return results;
}

/* ── Fetch all boards the user has access to ───────────────────────────
 *  Strategy: fetch page 1 to discover `total`, then fetch all remaining
 *  pages IN PARALLEL — completely bypasses the unreliable `isLast` flag
 *  which Jira Cloud can set to true on the first page even when hundreds
 *  of boards exist.                                                      */
export async function fetchAllBoards() {
  const PAGE = 50; // Jira Cloud hard cap per request is 50 for board API

  // --- Page 1: discover total ---
  let firstPage;
  try {
    firstPage = await jiraGet(`/rest/agile/1.0/board?maxResults=${PAGE}&startAt=0`);
  } catch {
    return [];
  }
  const total = typeof firstPage.total === "number" ? firstPage.total : null;
  let allValues = [...(firstPage.values ?? [])];

  // --- Remaining pages in parallel (if total is known and > PAGE) ---
  if (total && total > PAGE) {
    const startAts = [];
    for (let s = PAGE; s < total; s += PAGE) startAts.push(s);
    const pages = await Promise.allSettled(
      startAts.map((s) =>
        jiraGet(`/rest/agile/1.0/board?maxResults=${PAGE}&startAt=${s}`)
      )
    );
    for (const p of pages) {
      if (p.status === "fulfilled") allValues.push(...(p.value?.values ?? []));
    }
  } else if (!total) {
    // total unknown — fall back to sequential pagination (no isLast reliance)
    let startAt = PAGE;
    for (;;) {
      let data;
      try { data = await jiraGet(`/rest/agile/1.0/board?maxResults=${PAGE}&startAt=${startAt}`); }
      catch { break; }
      const vals = data.values ?? [];
      if (vals.length === 0) break;
      allValues.push(...vals);
      startAt += PAGE;
      if (vals.length < PAGE) break; // genuine last page
    }
  }

  // Deduplicate by board ID
  const seen = new Set();
  const unique = allValues.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });

  return unique
    .map((b) => ({
      id:          b.id,
      name:        b.name,
      type:        b.type,          // "scrum" | "kanban"
      projectKey:  b.location?.projectKey  ?? null,
      projectName: b.location?.projectName ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ── Fetch all sprints for a board (paginated, all states) ──────────────
 *  boardId — explicit ID; falls back to VITE_JIRA_BOARD_ID.            *
 *  Returns active-first, then newest-first.                             */
export async function fetchBoardSprints(boardId = null) {
  const id = boardId ?? import.meta.env.VITE_JIRA_BOARD_ID ?? "";
  if (!id) return [];
  const values = await paginateAgile(
    (startAt, max) =>
      `/rest/agile/1.0/board/${id}/sprint?state=active,closed,future&maxResults=${max}&startAt=${startAt}`
  );

  // Deduplicate by sprint ID
  const seen = new Set();
  const unique = values.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return unique
    .map((s) => ({
      id:           s.id,
      name:         s.name,
      state:        s.state,
      startDate:    s.startDate?.slice(0, 10) ?? null,
      endDate:      s.endDate?.slice(0, 10) ?? null,
      completeDate: s.completeDate?.slice(0, 10) ?? null,
    }))
    .sort((a, b) => {
      if (a.state === "active" && b.state !== "active") return -1;
      if (b.state === "active" && a.state !== "active") return 1;
      return b.id - a.id;
    });
}

/* ── Fetch comments on a ticket ────────────────────────────────────── */
export async function fetchComments(key) {
  try {
    const data = await jiraGet(
      `/rest/api/3/issue/${key}/comment?maxResults=20&orderBy=-created`
    );
    return (data.comments ?? []).map((c) => ({
      id:      c.id,
      author:  c.author?.displayName ?? "Unknown",
      avatar:  c.author?.avatarUrls?.["48x48"] ?? null,
      body:    adfToText(c.body),
      created: c.created?.slice(0, 10) ?? null,
    }));
  } catch {
    return [];
  }
}


