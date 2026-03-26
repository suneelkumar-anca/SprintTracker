export default function SetupBanner() {
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(129,140,248,0.08))", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 14, padding: "28px 32px", marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>Connect to Jira to load real data</h3>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 16px", lineHeight: 1.7 }}>
            Create a <code style={{ background: "var(--border-sub)", padding: "1px 6px", borderRadius: 4, color: "#818cf8" }}>.env</code> file in the project root:
          </p>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border-sub)", borderRadius: 10, padding: "16px 20px", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--text-2)", lineHeight: 2 }}>
            <div><span style={{ color: "var(--text-4)" }}># Required</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_JIRA_BASE_URL</span>=<span style={{ color: "#34d399" }}>https://yourcompany.atlassian.net</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_JIRA_EMAIL</span>=<span style={{ color: "#34d399" }}>your@email.com</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_JIRA_API_TOKEN</span>=<span style={{ color: "#34d399" }}>your-api-token</span></div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-5)", margin: "12px 0 0" }}>
            Get your API token: atlassian.com → Account settings → Security → API tokens
          </p>
        </div>
      </div>
    </div>
  );
}
