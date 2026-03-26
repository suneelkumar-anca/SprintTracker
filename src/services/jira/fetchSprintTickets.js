import { jiraGet, paginateIssues } from "./jiraClient.js";
import { detectStoryPointsField } from "./storyPointsDetector.js";
import { mapIssue } from "./mapIssue.js";
import { buildIssueFields } from "./buildFields.js";

export async function fetchSprintTickets(sprintIdOverride = null) {
  const envSprintId = import.meta.env.VITE_JIRA_SPRINT_ID ?? "";
  const boardId     = import.meta.env.VITE_JIRA_BOARD_ID  ?? "";
  const sprintId    = sprintIdOverride ?? envSprintId;
  await detectStoryPointsField();
  const fields = buildIssueFields(false);

  if (sprintId) {
    try {
      const issues = await paginateIssues((s, max) => `/rest/agile/1.0/sprint/${sprintId}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`);
      if (issues.length > 0) return issues.map(mapIssue);
    } catch { /* fall through */ }
    try {
      const issues = await paginateIssues((s, max) => `/rest/api/3/search?jql=${encodeURIComponent(`sprint = ${sprintId} ORDER BY created DESC`)}&fields=${fields}&maxResults=${max}&startAt=${s}`);
      if (issues.length > 0) return issues.map(mapIssue);
    } catch { /* fall through */ }
  }

  if (boardId) {
    try {
      const sprintData = await jiraGet(`/rest/agile/1.0/board/${boardId}/sprint?state=active&maxResults=5`);
      const active = sprintData.values?.[0];
      if (active) {
        const issues = await paginateIssues((s, max) => `/rest/agile/1.0/sprint/${active.id}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`);
        if (issues.length > 0) return issues.map(mapIssue);
      }
    } catch { /* fall through */ }
  }
  return [];
}
