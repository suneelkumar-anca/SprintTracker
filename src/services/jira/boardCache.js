const CACHE_KEY = "sprint_tracker_boards_cache";
const TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedBoards() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > TTL) return null;
    return data;
  } catch {
    return null;
  }
}

export function setCachedBoards(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
}

export function clearBoardCache() {
  localStorage.removeItem(CACHE_KEY);
}
