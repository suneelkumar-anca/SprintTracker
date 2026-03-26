import { fmtFull } from "../../utils/dateUtils.js";
import SavedReportActions from "./SavedReportActions.jsx";

export default function SavedReportCard({ report, idx, total, onLoad, onDelete, onExport, onMoveUp, onMoveDown, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isOver }) {
  const ticketCount = report.tickets?.length ?? 0;
  const doneCount   = (report.tickets ?? []).filter(t => (t.status ?? "").toLowerCase() === "done").length;
  const totalSP     = (report.tickets ?? []).reduce((s, t) => s + (Number.isFinite(t.sp) ? t.sp : 0), 0);
  const pct         = ticketCount > 0 ? Math.round((doneCount / ticketCount) * 100) : 0;

  return (
    <div draggable aria-label={`${report.name}, position ${idx + 1} of ${total}`} aria-describedby={`drag-hint-${report.id}`}
      onDragStart={e => onDragStart(e, idx)} onDragOver={e => onDragOver(e, idx)} onDrop={e => onDrop(e, idx)} onDragEnd={onDragEnd}
      style={{ background: "var(--bg-surface)", border: isOver ? "2px solid #3b82f6" : "1px solid var(--border)", borderRadius: 14, padding: isOver ? "19px 21px" : "20px 22px", display: "flex", flexDirection: "column", gap: 14, opacity: isDragging ? 0.35 : 1, cursor: "grab", transition: "opacity .15s, border-color .15s", boxShadow: isOver ? "0 0 0 3px rgba(59,130,246,0.15)" : "none", userSelect: "none" }}>
      <span id={`drag-hint-${report.id}`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}>Drag to reorder, or use the Move up and Move down buttons.</span>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flexShrink: 0, marginTop: 2, color: "var(--text-5)" }}>
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/><circle cx="3" cy="8" r="1.5"/><circle cx="9" cy="8" r="1.5"/><circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/></svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{report.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-4)" }}>Saved {fmtFull(report.savedAt)}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {[{ label: "Tickets", value: ticketCount, color: "var(--text)" }, { label: "Done", value: `${doneCount}/${ticketCount}`, color: "var(--color-success)" }, { label: "SP", value: totalSP, color: "var(--color-info)" }].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, background: "var(--bg-elevated)", border: "1px solid var(--border-sub)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-4)", marginBottom: 5, fontWeight: 600 }}><span>Progress</span><span>{pct}%</span></div>
        <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "var(--color-success)" : pct >= 50 ? "var(--color-warning)" : "var(--color-info)", borderRadius: 3, transition: "width .6s ease" }} />
        </div>
      </div>
      <SavedReportActions report={report} onLoad={onLoad} onExport={onExport} onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
    </div>
  );
}
