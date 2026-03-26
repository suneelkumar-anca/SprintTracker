export default function Pill({ children, color = "var(--text-3)", bg = "rgba(100,116,139,0.1)" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: bg, border: `1px solid ${color}30`,
      borderRadius: 6, padding: "3px 9px",
      color, fontSize: 11, fontWeight: 500,
    }}>
      {children}
    </span>
  );
}
