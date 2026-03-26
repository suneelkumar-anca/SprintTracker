import SavedReportCard from "./SavedReportCard.jsx";
import { useDragReorder } from "../../hooks/useDragReorder.js";

export default function SavedReportsView({ savedReports, onLoad, onDelete, onExport, onReorder }) {
  const { dragIdx, overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd, moveCard } = useDragReorder(savedReports, onReorder);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-hi)", margin: "0 0 4px", letterSpacing: "-0.4px" }}>Saved Reports</h2>
          <p style={{ fontSize: 13, color: "var(--text-4)", margin: 0 }}>
            {savedReports.length === 0 ? "No saved reports yet." : `${savedReports.length} saved sprint snapshot${savedReports.length !== 1 ? "s" : ""}${savedReports.length > 1 ? " · drag or use ▲▼ buttons to reorder" : ""}`}
          </p>
        </div>
      </div>
      {savedReports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border-sub)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="1.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-4)", margin: "0 0 6px" }}>No saved reports yet.</p>
          <p style={{ fontSize: 12, color: "var(--text-5)", margin: 0 }}>Load a sprint and click "↓ Save" to snapshot it here.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {savedReports.map((r, idx) => (
            <SavedReportCard key={r.id} report={r} idx={idx} total={savedReports.length}
              onLoad={onLoad} onDelete={onDelete} onExport={onExport}
              onMoveUp={idx > 0 ? () => moveCard(idx, -1) : null}
              onMoveDown={idx < savedReports.length - 1 ? () => moveCard(idx, 1) : null}
              onDragStart={handleDragStart} onDragOver={handleDragOver}
              onDrop={handleDrop} onDragEnd={handleDragEnd}
              isDragging={dragIdx === idx}
              isOver={overIdx === idx && dragIdx !== null && dragIdx !== idx} />
          ))}
        </div>
      )}
    </div>
  );
}
