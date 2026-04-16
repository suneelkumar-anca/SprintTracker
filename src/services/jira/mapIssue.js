import { adfToText } from "./adfToText.js";
import { FIELD_TL_COMMENT, FIELD_REVIEW_RATING, FIELD_ARTIFACTS, SP_CANDIDATES } from "./jiraConfig.js";
import { getDetectedSpFieldId } from "./storyPointsDetector.js";
import { safeNum, fmtTimeSpent } from "./issueFormatters.js";

export { safeNum, fmtTimeSpent };

export function mapIssue(raw) {
  const f = raw.fields;
  const startDate  = f.customfield_10020?.[0]?.startDate ?? f.created?.slice(0, 10) ?? null;
  const endDate    = f.customfield_10020?.[0]?.endDate   ?? f.duedate ?? f.updated?.slice(0, 10) ?? null;
  const sprintName = f.customfield_10020?.[0]?.name ?? null;

  // Capture all sprints (for detecting carried-over tickets)
  const allSprints = (f.customfield_10020 ?? []).map(s => ({
    id: s.id,
    name: s.name,
    state: s.state,
    startDate: s.startDate,
    endDate: s.endDate,
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

  const milestone = f.labels?.[0] ?? null;

  return {
    id: raw.key, description: f.summary ?? "", descriptionBody: adfToText(f.description),
    status: f.status?.name ?? "To Do", sp: spRaw,
    assigneeName: f.assignee?.displayName ?? "Unassigned",
    assigneeAvatar: f.assignee?.avatarUrls?.["48x48"] ?? null,
    assigneeEmail:  f.assignee?.emailAddress ?? null,
    startDate, endDate, sprintName, milestone, allSprints,
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
