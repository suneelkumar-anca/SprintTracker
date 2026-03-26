import { useDashboardStats } from "../../hooks/useDashboardStats.js";
import DashboardHeader from "./DashboardHeader.jsx";
import DashboardPersonCard from "./DashboardPersonCard.jsx";

export default function DashboardView({ sprintTickets, sprintLoaded, sprintLoading, currentSprintName, sprint, onSelectTicket }) {
  const stats = useDashboardStats(sprintTickets, sprint);

  if (sprintLoading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 16px", display: "block" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        <p style={{ fontSize: 13, color: "var(--text-4)", margin: 0 }}>Loading sprint data…</p>
      </div>
    );
  }

  if (!sprintLoaded || sprintTickets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--bg-surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-4)", margin: 0 }}>Select a board &amp; sprint to view the team dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader sprintName={currentSprintName} stats={stats} sprint={sprint} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {stats.people.map((p) => (
          <DashboardPersonCard key={p.name} person={p} onSelectTicket={onSelectTicket} />
        ))}
      </div>
    </div>
  );
}
