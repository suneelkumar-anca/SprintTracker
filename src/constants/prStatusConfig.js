const PR_STATUS_MAP = {
  MERGED:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   label: "Merged"   },
  OPEN:     { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  label: "Open"     },
  DECLINED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   label: "Declined" },
};

const FALLBACK = { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", label: "" };

export function prStatusCfg(s) {
  const entry = PR_STATUS_MAP[s];
  return entry ?? { ...FALLBACK, label: s ?? "PR" };
}
