import { memo } from "react";

const BoardSelector = memo(function BoardSelector({
  boards = [],
  selectedBoardId = "",
  onSelectBoard = () => {},
  loading = false,
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 32,
              width: 120,
              borderRadius: 7,
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-sub)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div style={{ padding: "12px 16px", color: "var(--text-3)", fontSize: 13, textAlign: "center" }}>
        No boards found
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
      {boards.map((board) => {
        const isSelected = selectedBoardId === board.id;
        return (
          <button
            key={board.id}
            onClick={() => onSelectBoard(board.id)}
            title={board.name}
            style={{
              padding: "8px 12px",
              borderRadius: 7,
              border: isSelected ? "2px solid #3b82f6" : "1px solid var(--border-sub)",
              background: isSelected ? "#1e40af" : "var(--bg)",
              color: isSelected ? "#fff" : "var(--text)",
              fontSize: 12,
              fontWeight: isSelected ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 180,
              boxShadow: isSelected ? "0 0 12px rgba(59, 130, 246, 0.4)" : "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.background = "var(--bg-primary-subtle)";
              } else {
                e.currentTarget.style.boxShadow = "0 0 16px rgba(59, 130, 246, 0.6)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "var(--border-sub)";
                e.currentTarget.style.background = "var(--bg)";
              } else {
                e.currentTarget.style.boxShadow = "0 0 12px rgba(59, 130, 246, 0.4)";
              }
            }}
          >
            {isSelected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {board.name}
            </span>
          </button>
        );
      })}
    </div>
  );
});

export default BoardSelector;
