import { paginateAgile } from "./jiraClient.js";
import { getCachedBoards, setCachedBoards } from "./boardCache.js";

export async function fetchAllBoards() {
  const cached = getCachedBoards();
  if (cached) return cached;

  const values = await paginateAgile(
    (startAt, pageSize) => `/rest/agile/1.0/board?maxResults=${pageSize}&startAt=${startAt}`
  );

  const seen = new Set();
  const boards = values
    .filter((b) => { if (seen.has(b.id)) return false; seen.add(b.id); return true; })
    .map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      projectKey: b.location?.projectKey ?? null,
      projectName: b.location?.projectName ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (boards.length > 0) setCachedBoards(boards);
  return boards;
}
