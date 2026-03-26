const STATUS_MAP = {
  "done":          { color: "var(--color-success)", bg: "rgba(34,197,94,0.12)",   dot: "var(--color-success)" },
  "in progress":   { color: "var(--color-warning)", bg: "rgba(245,158,11,0.12)",  dot: "var(--color-warning)" },
  "in review":     { color: "var(--color-accent)",  bg: "rgba(129,140,248,0.12)", dot: "var(--color-accent)" },
  "rejected":      { color: "var(--color-error)",   bg: "rgba(239,68,68,0.12)",   dot: "var(--color-error)" },
  "to do":         { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", dot: "var(--text-3)" },
  "not started":   { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", dot: "var(--text-3)" },
  "closed":        { color: "var(--color-success)", bg: "rgba(34,197,94,0.12)",   dot: "var(--color-success)" },
  "resolved":      { color: "var(--color-success)", bg: "rgba(34,197,94,0.12)",   dot: "var(--color-success)" },
  "open":          { color: "var(--color-info)",    bg: "rgba(96,165,250,0.12)",  dot: "var(--color-info)" },
  "blocked":       { color: "var(--color-error)",   bg: "rgba(239,68,68,0.12)",   dot: "var(--color-error)" },
  "queued":        { color: "var(--color-sky)",     bg: "rgba(56,189,248,0.12)",  dot: "var(--color-sky)" },
  "ready for dev": { color: "var(--color-info)",    bg: "rgba(96,165,250,0.12)",  dot: "var(--color-info)" },
  "backlog":       { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", dot: "var(--text-3)" },
  "cancelled":     { color: "var(--color-error)",   bg: "rgba(239,68,68,0.12)",   dot: "var(--color-error)" },
  "on hold":       { color: "var(--color-orange)",  bg: "rgba(249,115,22,0.12)",  dot: "var(--color-orange)" },
  "testing":       { color: "var(--color-accent)",  bg: "rgba(129,140,248,0.12)", dot: "var(--color-accent)" },
  "deployed":      { color: "var(--color-success)", bg: "rgba(34,197,94,0.12)",   dot: "var(--color-success)" },
};

const FALLBACK = { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", dot: "var(--text-3)" };

export function statusCfg(s) {
  return STATUS_MAP[(s ?? "").toLowerCase()] ?? FALLBACK;
}
