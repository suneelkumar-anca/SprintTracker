import { useState, useEffect } from "react";
import { statusCfg } from "../../constants/statusConfig.js";
import TicketHeader from "./TicketHeader.jsx";
import TicketMetaGrid from "./TicketMetaGrid.jsx";
import TicketArtifacts from "./TicketArtifacts.jsx";
import CommentsSection from "./CommentsSection.jsx";
import PRCard from "./PRCard.jsx";
import Section from "../ui/Section.jsx";
import TimelineBar from "../ui/TimelineBar.jsx";
import Skeleton from "../ui/Skeleton.jsx";
import { TIMELINE_ICON, ARTIFACTS_ICON, COMMENTS_ICON, CLOCK_ICON, PR_ICON } from "./ticketSectionIcons.jsx";

export default function TicketCard({ ticket, prs, prsLoading, comments, commentsLoading }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 40); return () => clearTimeout(t); }, []);
  const cfg = statusCfg(ticket.status);

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden",
      opacity: show ? 1 : 0, transform: show ? "translateY(0) scale(1)" : "translateY(20px) scale(0.99)",
      transition: "opacity .4s ease, transform .4s ease",
      boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}40)` }} />
      <TicketHeader ticket={ticket} />
      <TicketMetaGrid ticket={ticket} />
      <Section label="Sprint Timeline" icon={TIMELINE_ICON}>
        {ticket.startDate && ticket.endDate ? <TimelineBar startDate={ticket.startDate} endDate={ticket.endDate} />
          : <span style={{ fontSize: 13, color: "var(--text-5)" }}>No date information available from Jira.</span>}
      </Section>
      <Section label="Artifacts" icon={ARTIFACTS_ICON}>
        <TicketArtifacts prs={prs} prsLoading={prsLoading} ticket={ticket} />
      </Section>
      <Section label="Comments" icon={COMMENTS_ICON}>
        <CommentsSection tlComment={ticket.tlComment} comments={comments} commentsLoading={commentsLoading} />
      </Section>
      {ticket.timeSpent && (
        <Section label="Time Spent" noBorder icon={CLOCK_ICON}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{ticket.timeSpent}</span>
        </Section>
      )}
      <Section label="Pull Requests · Bitbucket" noBorder icon={PR_ICON}>
        {prsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Skeleton h={52} radius={10} /><Skeleton h={52} radius={10} /></div>
        ) : prs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{prs.map((pr) => <PRCard key={pr.id} pr={pr} />)}</div>
        ) : (
          <span style={{ fontSize: 13, color: "var(--text-5)" }}>No linked pull requests found. <a href={ticket.jiraUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>Open in Jira ↗</a></span>
        )}
      </Section>
    </div>
  );
}
