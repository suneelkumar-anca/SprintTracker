import { jiraGet } from "./jiraClient.js";
import { detectStoryPointsField } from "./storyPointsDetector.js";
import { mapIssue } from "./mapIssue.js";
import { buildIssueFields } from "./buildFields.js";

export async function fetchTicket(key) {
  await detectStoryPointsField();
  const data = await jiraGet(`/rest/api/3/issue/${key}?fields=${buildIssueFields(true)}`);
  return mapIssue(data);
}
