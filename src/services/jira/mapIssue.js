import { adfToText } from "./adfToText.js";
import { FIELD_TL_COMMENT, FIELD_REVIEW_RATING, FIELD_ARTIFACTS, FIELD_TEAM, SP_CANDIDATES } from "./jiraConfig.js";
import { getDetectedSpFieldId } from "./storyPointsDetector.js";
import { safeNum, fmtTimeSpent } from "./issueFormatters.js";

export { safeNum, fmtTimeSpent };

export function mapIssue(raw) {
  const f = raw.fields;
  
  // Normalize dates to YYYY-MM-DD format (handle both date strings and ISO timestamps)
  const normalizeDate = (d) => {
    if (!d) return null;
    // If it's already a date string (YYYY-MM-DD), return as-is
    // If it's a timestamp (contains T), extract just the date part
    return typeof d === "string" ? d.slice(0, 10) : null;
  };
  
  // For start date, prefer sprint start date, fallback to created
  const startDate = normalizeDate(f.customfield_10020?.[0]?.startDate) ?? normalizeDate(f.created) ?? null;
  
  // For end date, try multiple sources in order:
  // 1. Sprint end date (from active/future sprint)
  // 2. Due date (ticket's due date)
  // 3. Updated date (last modification)
  // 4. Created date (as last resort)
  let endDate = normalizeDate(f.customfield_10020?.[0]?.endDate) ?? normalizeDate(f.duedate) ?? null;
  if (!endDate) {
    endDate = normalizeDate(f.updated);
  }
  if (!endDate) {
    endDate = normalizeDate(f.created);
  }
  
  const sprintName = f.customfield_10020?.[0]?.name ?? null;

  // Capture all sprints (for detecting carried-over tickets)
  const allSprints = (f.customfield_10020 ?? []).map(s => ({
    id: s.id,
    name: s.name,
    state: s.state,
    startDate: normalizeDate(s.startDate),
    endDate: normalizeDate(s.endDate),
  }));

  let spRaw = null;
  const spFieldList = [...(getDetectedSpFieldId() ? [getDetectedSpFieldId()] : []), ...SP_CANDIDATES];
  for (const fId of spFieldList) {
    const v = safeNum(f[fId]);
    if (v !== null) { spRaw = v; break; }
  }

  const tlComment    = f[FIELD_TL_COMMENT] ?? null;
  const reviewRating = f[FIELD_REVIEW_RATING] != null ? Number(f[FIELD_REVIEW_RATING]) : null;
  const artifacts    = f[FIELD_ARTIFACTS] ?? null;
  
  // Extract team from custom field (can be string, object, or array)
  let team = null;
  const teamField = f[FIELD_TEAM];
  if (teamField) {
    if (typeof teamField === "string") {
      team = teamField;
    } else if (Array.isArray(teamField)) {
      // If it's an array, take the first item
      team = teamField[0]?.name ?? teamField[0] ?? null;
    } else if (teamField.name) {
      // If it's an object with a name property (common for Jira custom field objects)
      team = teamField.name;
    } else {
      team = String(teamField);
    }
  }

  const milestone = f.labels?.[0] ?? null;

  return {
    id: raw.key, description: f.summary ?? "", descriptionBody: adfToText(f.description),
    status: f.status?.name ?? "To Do", sp: spRaw,
    assigneeName: f.assignee?.displayName ?? "Unassigned",
    assigneeAvatar: f.assignee?.avatarUrls?.["48x48"] ?? null,
    assigneeEmail:  f.assignee?.emailAddress ?? null,
    startDate, endDate, sprintName, milestone, allSprints, team,
    priority: f.priority?.name ?? null,
    labels: f.labels ?? [], components: (f.components ?? []).map((c) => c.name),
    tlComment, reviewRating, artifacts,
    issueType: f.issuetype?.name ?? null, issueTypeIcon: f.issuetype?.iconUrl ?? null,
    reporter: f.reporter?.displayName ?? null,
    created: f.created?.slice(0, 10) ?? null, updated: f.updated?.slice(0, 10) ?? null,
    numericId: raw.id ?? null,
    jiraUrl: `${import.meta.env.VITE_JIRA_BASE_URL ?? ""}/browse/${raw.key}`,
    timeSpent: fmtTimeSpent(f.aggregatetimespent ?? f.timespent ?? null),
  };
}
