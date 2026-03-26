export default function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "64px 24px" }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--bg-elevated)",
        border: "1px solid var(--border-sub)", display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-4)", margin: 0 }}>
        Enter a Jira ticket ID above to load its details.
      </p>
      <p style={{ fontSize: 12, color: "var(--text-5)", margin: "6px 0 0" }}>e.g. TR-38275, PROJ-123</p>
    </div>
  );
}
