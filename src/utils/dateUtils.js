export const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "\u2014";

export const fmtFull = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";

export function relativeDuration(start, end) {
  if (!start || !end) return null;
  const days = Math.round((new Date(end) - new Date(start)) / 86400000);
  return `${days} day${days !== 1 ? "s" : ""}`;
}
