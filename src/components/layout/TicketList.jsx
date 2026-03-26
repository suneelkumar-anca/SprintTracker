import { memo } from "react";
import TicketRow from "../ticket/TicketRow.jsx";

const TicketList = memo(function TicketList({ tickets, activeId, onSelect }) {
  if (tickets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px" }}>
        <p style={{ fontSize: 13, color: "var(--text-5)", margin: 0 }}>No tickets match the current filters.</p>
      </div>
    );
  }
  return (
    <>
      {tickets.map((t) => (
        <TicketRow key={t.id} ticket={t} onSelect={onSelect} isActive={activeId === t.id} />
      ))}
    </>
  );
});

export default TicketList;
