import { paginateAgile } from "./jiraClient.js";

export async function fetchBoardSprints(boardId = null) {
  const id = boardId ?? import.meta.env.VITE_JIRA_BOARD_ID ?? "";
  if (!id) return [];

  const values = await paginateAgile(
    (startAt, max) =>
      `/rest/agile/1.0/board/${id}/sprint?state=active,closed,future&maxResults=${max}&startAt=${startAt}`
  );

  const seen = new Set();
  const unique = values.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return unique
    .map((s) => ({
      id:           s.id,
      name:         s.name,
      state:        s.state,
      startDate:    s.startDate?.slice(0, 10)    ?? null,
      endDate:      s.endDate?.slice(0, 10)      ?? null,
      completeDate: s.completeDate?.slice(0, 10) ?? null,
    }))
    .sort((a, b) => {
      if (a.state === "active" && b.state !== "active") return -1;
      if (b.state === "active" && a.state !== "active") return 1;
      return b.id - a.id;
    });
}
