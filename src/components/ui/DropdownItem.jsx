import { useRef, useEffect } from "react";

export default function DropdownItem({ id, opt, value, accentColor, onSelect, isFocused }) {
  const ref = useRef(null);
  const selected = String(opt.value) === String(value);

  useEffect(() => {
    if (isFocused) ref.current?.scrollIntoView({ block: "nearest" });
  }, [isFocused]);

  return (
    <div ref={ref} id={id} role="option" aria-selected={selected}
      onClick={() => onSelect(opt)}
      style={{
        padding: "7px 10px", fontSize: 12, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6,
        background: isFocused ? "var(--bg-elevated)" : selected ? "var(--bg-card)" : "transparent",
        color: selected ? accentColor : "var(--text-2)",
        fontWeight: selected ? 600 : 400,
        transition: "background .1s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = selected ? "var(--bg-card)" : "transparent"; }}>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
      {opt.badge && (
        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
          background: opt.badge === "active" ? "rgba(34,197,94,0.15)" : "var(--bg-elevated)",
          color: opt.badge === "active" ? "var(--color-success)" : "var(--text-4)",
          textTransform: "uppercase", letterSpacing: "0.04em" }}>{opt.badge}</span>
      )}
    </div>
  );
}
