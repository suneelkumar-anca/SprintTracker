export function safeNum(v) {
  if (v == null) return null;
  const n = typeof v === "object" ? Number(v?.value ?? v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function fmtTimeSpent(seconds) {
  if (!seconds || seconds <= 0) return "";
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours   > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.length ? parts.join(" ") : "< 1m";
}
