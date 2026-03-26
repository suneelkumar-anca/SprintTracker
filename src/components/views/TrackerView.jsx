import TicketCard from "../ticket/TicketCard.jsx";
import EmptyState from "../views/EmptyState.jsx";
import Skeleton from "../ui/Skeleton.jsx";
import SprintPanel from "../layout/SprintPanel.jsx";
import TicketSearchInput from "./TicketSearchInput.jsx";

export default function TrackerView({
  ticket, prs, prsLoading, comments, commentsLoading, loading, error, query, setQuery, lookup, clearAll,
  configured, sprintProps,
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 28, alignItems: "start" }}>
      <div>
        <TicketSearchInput query={query} setQuery={setQuery} lookup={lookup} clearAll={clearAll} loading={loading} error={error} configured={configured} />
        {loading ? (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ height: 3, background: "var(--border-sub)" }} />
            <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}><Skeleton w={80} h={20} /><Skeleton w={80} h={20} /></div>
              <Skeleton h={26} /><div style={{ marginTop: 10 }} /><Skeleton w="70%" h={18} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "var(--bg-nav)" }}>
              {[0,1,2].map(i=><div key={i} style={{ padding: "16px 20px", borderRight: i<2?"1px solid var(--border)":"none" }}><Skeleton w={60} h={10}/><div style={{ marginTop: 12 }}/><Skeleton h={32}/></div>)}
            </div>
            <div style={{ padding: "18px 24px" }}><Skeleton h={8} /></div>
          </div>
        ) : ticket ? (
          <TicketCard ticket={ticket} prs={prs} prsLoading={prsLoading} comments={comments} commentsLoading={commentsLoading} />
        ) : <EmptyState />}
      </div>
      <SprintPanel {...sprintProps} />
    </div>
  );
}
