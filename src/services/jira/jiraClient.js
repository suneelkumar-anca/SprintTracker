import { BASE, EMAIL, TOKEN } from "./jiraConfig.js";

export function authHeader() {
  return {
    Authorization: `Basic ${btoa(`${EMAIL}:${TOKEN}`)}`,
    "Content-Type": "application/json",
  };
}

export async function jiraGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeader() });
  if (!res.ok) {
    // For 410 Gone errors, return a special marker object instead of throwing
    // This allows pagination to handle end-of-results gracefully without console errors
    if (res.status === 410) {
      return { __isGone: true };
    }
    const text = await res.text().catch(() => "");
    throw new Error(`Jira ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function paginateAgile(buildUrl, pageSize = 50) {
  const results = [];
  let startAt = 0;
  let total = Infinity;
  for (;;) {
    let data;
    try { 
      data = await jiraGet(buildUrl(startAt, pageSize));
      // Stop if we hit a 410 (end of results)
      if (data?.__isGone) break;
    }
    catch { break; }
    const values = data.values ?? [];
    results.push(...values);
    if (typeof data.total === "number") total = data.total;
    if (values.length === 0) break;
    if (results.length >= total) break;
    if (total === Infinity && data.isLast === true) break;
    startAt += pageSize;
  }
  return results;
}

export { paginateIssues } from "./paginateIssues.js";
