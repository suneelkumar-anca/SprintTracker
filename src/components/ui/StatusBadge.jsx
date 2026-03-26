import { statusCfg } from "../../constants/statusConfig.js";

export default function StatusBadge({ status }) {
  const cfg = statusCfg(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, border: `1px solid ${cfg.color}30`,
      borderRadius: 6, padding: "3px 9px",
      color: cfg.color, fontSize: 11, fontWeight: 600,
      letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {status ?? "Unknown"}
    </span>
  );
}
