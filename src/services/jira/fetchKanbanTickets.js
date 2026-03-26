import { jiraGet, paginateIssues } from "./jiraClient.js";
import { detectStoryPointsField } from "./storyPointsDetector.js";
import { mapIssue } from "./mapIssue.js";
import { buildIssueFields } from "./buildFields.js";

export async function fetchKanbanTickets(boardId) {
  if (!boardId) return [];
  await detectStoryPointsField();
  const fields = buildIssueFields(false);
  const issues = await paginateIssues(
    (s, max) => `/rest/agile/1.0/board/${boardId}/issue?fields=${fields}&maxResults=${max}&startAt=${s}`
  );
  return issues.map(mapIssue);
}
