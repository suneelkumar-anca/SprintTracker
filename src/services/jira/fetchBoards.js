import { jiraGet } from "./jiraClient.js";
import { getCachedBoards, setCachedBoards } from "./boardCache.js";

export async function fetchAllBoards() {
  const cached = getCachedBoards();
  if (cached) return cached;
  const PAGE = 50;
  let firstPage;
  try { firstPage = await jiraGet(`/rest/agile/1.0/board?maxResults=${PAGE}&startAt=0`); }
  catch { return []; }

  const total = typeof firstPage.total === "number" ? firstPage.total : null;
  let allValues = [...(firstPage.values ?? [])];

  if (total && total > PAGE) {
    const startAts = [];
    for (let s = PAGE; s < total; s += PAGE) startAts.push(s);
    const pages = await Promise.allSettled(
      startAts.map((s) => jiraGet(`/rest/agile/1.0/board?maxResults=${PAGE}&startAt=${s}`))
    );
    for (const p of pages) {
      if (p.status === "fulfilled") allValues.push(...(p.value?.values ?? []));
    }
  } else if (!total) {
    let startAt = PAGE;
    for (;;) {
      let data;
      try { data = await jiraGet(`/rest/agile/1.0/board?maxResults=${PAGE}&startAt=${startAt}`); }
      catch { break; }
      const vals = data.values ?? [];
      if (vals.length === 0) break;
      allValues.push(...vals);
      startAt += PAGE;
      if (vals.length < PAGE) break;
    }
  }

  const seen = new Set();
  const boards = allValues
    .filter((b) => { if (seen.has(b.id)) return false; seen.add(b.id); return true; })
    .map((b) => ({
      id: b.id, name: b.name, type: b.type,
      projectKey:  b.location?.projectKey  ?? null,
      projectName: b.location?.projectName ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  setCachedBoards(boards);
  return boards;
}
