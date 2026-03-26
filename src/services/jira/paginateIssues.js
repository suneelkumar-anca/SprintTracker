import { jiraGet } from "./jiraClient.js";

export async function paginateIssues(buildUrl) {
  const PAGE = 50, BATCH = 5;
  const all = [];
  let startAt = 0, done = false;
  while (!done) {
    const offsets = Array.from({ length: BATCH }, (_, i) => startAt + i * PAGE);
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
