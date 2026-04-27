import { memo } from "react";

const LabelsGrid = memo(function LabelsGrid({
  labels = [],
  selectedLabels = [],
  onToggleLabel = () => {},
  viewMode = "grid", // "grid" or "list"
  loading = false,
}) {
  if (loading) {
    return (
      <div
        style={{
          display: viewMode === "grid" ? "grid" : "flex",
          gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(140px, 1fr))" : undefined,
          flexDirection: viewMode === "list" ? "column" : undefined,
          gap: 10,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              height: viewMode === "grid" ? 80 : 40,
              borderRadius: 8,
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-sub)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (labels.length === 0) {
    return (
      <div
        style={{
          padding: "40px 24px",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: 13,
          borderRadius: 8,
          border: "1px dashed var(--border-sub)",
          background: "var(--bg-subtle)",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ marginBottom: 12, opacity: 0.5, display: "block", margin: "0 auto 12px" }}
        >
          <path d="M7.5 7.5H.75a.75.75 0 0 0-.75.75v14a.75.75 0 0 0 .75.75h14a.75.75 0 0 0 .75-.75v-6.75" />
          <path d="M9 4.5a2.25 2.25 0 1 0 4.5 0 2.25 2.25 0 0 0-4.5 0Z" />
        </svg>
        <p style={{ margin: 0 }}>No labels found in this board</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: viewMode === "grid" ? "grid" : "flex",
        gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(140px, 1fr))" : undefined,
        flexDirection: viewMode === "list" ? "column" : undefined,
        gap: 10,
      }}
    >
      {labels.map((label) => {
        const isSelected = selectedLabels.includes(label);
        return (
          <button
            key={label}
            onClick={() => onToggleLabel(label)}
            style={{
              padding: viewMode === "grid" ? "12px 16px" : "10px 12px",
              borderRadius: 8,
              border: isSelected ? "2px solid #8b5cf6" : "1px solid var(--border-sub)",
              background: isSelected ? "#6d28d9" : "var(--bg)",
              color: isSelected ? "#fff" : "var(--text)",
              fontSize: 12,
              fontWeight: isSelected ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: viewMode === "grid" ? "center" : "left",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              display: viewMode === "grid" ? "flex" : "flex",
              alignItems: "center",
              justifyContent: viewMode === "grid" ? "center" : "flex-start",
              minHeight: viewMode === "grid" ? 60 : undefined,
              gap: viewMode === "grid" ? 6 : 6,
              boxShadow: isSelected ? "0 0 12px rgba(139, 92, 246, 0.4)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "#8b5cf6";
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
              } else {
                e.currentTarget.style.boxShadow = "0 0 16px rgba(139, 92, 246, 0.6)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "var(--border-sub)";
                e.currentTarget.style.background = "var(--bg)";
              } else {
                e.currentTarget.style.boxShadow = "0 0 12px rgba(139, 92, 246, 0.4)";
              }
            }}
            title={label}
          >
            {isSelected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
});

export default LabelsGrid;
