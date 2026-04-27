import { jiraGet } from "./jiraClient.js";

export async function paginateIssues(buildUrl) {
  const PAGE = 50;
  const all = [];

  // Fetch the first page to discover the total count
  const first = await jiraGet(buildUrl(0, PAGE));
  if (!first || first.__isGone) return all;

  const firstIssues = first.issues ?? [];
  all.push(...firstIssues);

  const total = typeof first.total === "number" ? first.total : firstIssues.length;

  // If first page already has everything, return early
  if (firstIssues.length < PAGE || all.length >= total) return all;

  // Calculate remaining pages needed (never request beyond total)
  const offsets = [];
  for (let s = PAGE; s < total; s += PAGE) {
    offsets.push(s);
  }

  if (offsets.length === 0) return all;

  // Fetch remaining pages in parallel batches of 5
  const BATCH = 5;
  for (let i = 0; i < offsets.length; i += BATCH) {
    const batch = offsets.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((s) => jiraGet(buildUrl(s, PAGE))));

    let anyData = false;
    for (const r of results) {
      if (r.status === "fulfilled" && !r.value?.__isGone) {
        const issues = r.value?.issues ?? [];
        all.push(...issues);
        if (issues.length > 0) anyData = true;
      }
    }

    // If no data came back from the entire batch, stop
    if (!anyData) break;
  }

  return all;
}
