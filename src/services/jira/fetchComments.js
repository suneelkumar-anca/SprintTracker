import { jiraGet } from "./jiraClient.js";
import { adfToText } from "./adfToText.js";
import { EMAIL, TOKEN } from "./jiraConfig.js";

export function isJiraConfigured() {
  return !!(import.meta.env.VITE_JIRA_BASE_URL && EMAIL && TOKEN);
}

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
