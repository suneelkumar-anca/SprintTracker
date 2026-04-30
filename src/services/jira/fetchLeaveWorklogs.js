import { jiraGet } from "./jiraClient.js";
import { LEAVE_ISSUE_KEYS, HOLIDAY_ISSUE_KEYS, TEMPO_API_TOKEN, TEMPO_BASE } from "./jiraConfig.js";

/**
 * Paginate all worklogs for a single Jira issue using the standard Jira REST API.
 */
async function paginateWorklogs(issueKey) {
  const PAGE = 100;
  const all = [];
  let startAt = 0;
  for (;;) {
    let data;
    try {
      data = await jiraGet(
        `/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog?startAt=${startAt}&maxResults=${PAGE}`
      );
    } catch { break; }
    if (!data || data.__isGone) break;
    const wls = data.worklogs ?? [];
    all.push(...wls);
    const total = typeof data.total === "number" ? data.total : wls.length;
    if (all.length >= total || wls.length < PAGE) break;
    startAt += PAGE;
  }
  return all;
}

/**
 * Paginate Tempo Cloud API worklogs for a single issue by numeric ID.
 * GET /4/worklogs?issueId={numericId}&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=1000&offset=0
 * IMPORTANT: Tempo v4 `issueKey` param is silently ignored (returns ALL worklogs).
 *            Must use `issueId` (numeric Jira issue ID) for filtering.
 */
async function paginateTempoWorklogs(issueId, from, to) {
  const LIMIT = 1000;
  const all = [];
  let offset = 0;
  for (;;) {
    let data;
    try {
      const url = `${TEMPO_BASE}/4/worklogs?issueId=${issueId}&from=${from}&to=${to}&limit=${LIMIT}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Tempo ${res.status}`);
      data = await res.json();
    } catch { break; }
    const results = data?.results ?? [];
    all.push(...results);
    if (results.length < LIMIT || !data?.metadata?.next) break;
    offset += LIMIT;
  }
  return all;
}

/** Cache: issue key → numeric ID */
const issueIdCache = {};

/** Resolve a Jira issue key (e.g. "INT-4") to its numeric ID via Jira REST API. */
async function resolveIssueId(issueKey) {
  if (issueIdCache[issueKey]) return issueIdCache[issueKey];
  try {
    const data = await jiraGet(`/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary`);
    const id = data?.id;
    if (id) { issueIdCache[issueKey] = String(id); return String(id); }
  } catch { /* ignore */ }
  return null;
}

/**
 * Fetch leave + public holiday data.
 *
 * Two modes:
 * 1. **Tempo API token available**: Fetches per-person leave from api.tempo.io.
 *    Counts unique leave dates per team member.
 * 2. **No token (fallback)**: Uses Jira Worklog API (Tempo masks authors).
 *    Total person-days ÷ team size = avg leave per person.
 *
 * @param {string[]} memberNames  - team member display names
 * @param {string}   startDate    - "YYYY-MM-DD" project start
 * @param {string}   endDate      - "YYYY-MM-DD" project end
 * @param {number}   teamSize     - number of team members
 * @param {Object}   accountMap   - { accountId: displayName } for Tempo author resolution
 * @returns {Promise<{ leaveDays: number, publicHolidays: number, totalLeaveDays: number, perPerson: Object }>}
 */
export async function fetchLeaveAndHolidays(memberNames, startDate, endDate, teamSize = 1, accountMap = {}) {
  // ── Holidays: unique dates from INT-24 worklogs ──────────────────────────
  const holidayDates = new Set();
  if (HOLIDAY_ISSUE_KEYS.length > 0) {
    if (TEMPO_API_TOKEN) {
      for (const key of HOLIDAY_ISSUE_KEYS) {
        const numericId = await resolveIssueId(key);
        if (!numericId) continue;
        const worklogs = await paginateTempoWorklogs(numericId, startDate, endDate);
        for (const wl of worklogs) {
          const d = wl.startDate ?? "";
          if (d) holidayDates.add(d);
        }
      }
    } else {
      const holidayResults = await Promise.allSettled(
        HOLIDAY_ISSUE_KEYS.map(key => paginateWorklogs(key))
      );
      for (const result of holidayResults) {
        if (result.status !== "fulfilled") continue;
        for (const wl of result.value) {
          const started = (wl.started ?? "").slice(0, 10);
          if (startDate && started < startDate) continue;
          if (endDate && started > endDate) continue;
          holidayDates.add(started);
        }
      }
    }
  }

  // ── Leave: Per-person leave cannot be auto-fetched ─────────────────────────
  // - Tempo personal token only returns the token-owner's worklogs (not other team members)
  // - Jira REST API returns ALL company worklogs with authors masked as "Timesheets by Tempo"
  // - Neither API can identify which worklogs belong to specific team members
  // Therefore: default to 0, let users manually enter per-person leave via the UI inputs
  const perPerson = {};
  for (const name of memberNames) {
    perPerson[name] = 0;
  }

  console.log(
    `[Leave] Per-person leave defaults to 0 (manual entry required) | ` +
    `${holidayDates.size} public holiday dates (auto-fetched)`
  );

  return {
    leaveDays: 0,
    publicHolidays: holidayDates.size,
    totalLeaveDays: 0,
    perPerson,
  };
}
