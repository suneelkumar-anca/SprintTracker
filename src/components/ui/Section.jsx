export default function Section({ label, icon, children, noBorder = false }) {
  return (
    <div style={{ padding: "18px 24px", borderBottom: noBorder ? "none" : "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        {icon && <span style={{ opacity: 0.4 }}>{icon}</span>}
        <span style={{
          fontSize: 10, color: "var(--text-4)", textTransform: "uppercase",
          letterSpacing: "0.1em", fontWeight: 600,
        }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
