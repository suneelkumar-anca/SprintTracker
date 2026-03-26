import { lazy, Suspense } from "react";
import { useAppState } from "./hooks/useAppState.js";
import { useAppHandlers } from "./hooks/useAppHandlers.js";
import AppHeader from "./components/layout/AppHeader.jsx";
import StatsBar from "./components/layout/StatsBar.jsx";
import SetupBanner from "./components/views/SetupBanner.jsx";
import AppSkeleton from "./components/views/AppSkeleton.jsx";

const TrackerView = lazy(() => import("./components/views/TrackerView.jsx"));
const DashboardView = lazy(() => import("./components/views/DashboardView.jsx"));
const SavedReportsView = lazy(() => import("./components/views/SavedReportsView.jsx"));

export default function App() {
  const state = useAppState();
  const { handleSelectTicket, handleLoadSnapshot, sprintPanelProps } = useAppHandlers(state);
  const { configured, activeView, setActiveView, themePref, setThemePref,
    sprintTickets, sprintLoading, sprintLoaded, lookup, saved,
    currentSprintName, currentSprint, totalSP, doneSP, doneCount } = state;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Inter, sans-serif", color: "var(--text)" }}>
      <AppHeader activeView={activeView} setActiveView={setActiveView} themePref={themePref} setThemePref={setThemePref} configured={configured} savedCount={saved.savedReports.length} />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>
        {!configured && <SetupBanner />}
        <StatsBar totalTickets={sprintTickets.length} doneCount={doneCount} totalSP={totalSP} doneSP={doneSP} currentSprintName={currentSprintName} />
        <Suspense fallback={<AppSkeleton />}>
        {activeView === "saved" && (
          <SavedReportsView savedReports={saved.savedReports}
            onLoad={handleLoadSnapshot}
            onDelete={saved.removeSavedReport} onExport={async (r) => { const { exportToExcel } = await import("./services/excel/index.js"); exportToExcel(r.tickets, r.name); }} onReorder={saved.reorderSaved} />
        )}
        {activeView === "dashboard" && (
          <DashboardView sprintTickets={sprintTickets} sprintLoaded={sprintLoaded} sprintLoading={sprintLoading}
            currentSprintName={currentSprintName} sprint={currentSprint}
            onSelectTicket={handleSelectTicket} />
        )}
        {activeView === "tracker" && (
          <TrackerView ticket={lookup.ticket} prs={lookup.prs} prsLoading={lookup.prsLoading}
            comments={lookup.comments} commentsLoading={lookup.commentsLoading}
            loading={lookup.loading} error={lookup.error} query={lookup.query}
            setQuery={lookup.setQuery} lookup={lookup.lookup} clearAll={lookup.clearAll}
            configured={configured} sprintProps={sprintPanelProps} />
        )}
        </Suspense>
      </main>
    </div>
  );
}
