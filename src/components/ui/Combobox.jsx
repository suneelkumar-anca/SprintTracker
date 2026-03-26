import DropdownItem from "./DropdownItem.jsx";
import { useCombobox } from "../../hooks/useCombobox.js";

export default function Combobox({ options, value, onChange, placeholder, loading, icon, accentColor = "#3b82f6" }) {
  const cb = useCombobox({ options, value, onChange, placeholder, loading });
  const borderColor = cb.active ? accentColor : cb.open ? "var(--text-5)" : "var(--border-sub)";

  return (
    <div ref={cb.ref} style={{ position: "relative" }}>
      <div role="combobox" aria-expanded={cb.open} aria-haspopup="listbox" aria-controls={cb.listId} aria-label={placeholder}
        onClick={() => { if (!loading) { cb.open ? cb.closeDropdown() : cb.openDropdown(); } }}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg)", border: `1px solid ${borderColor}`, borderRadius: 7, padding: "6px 8px 6px 28px", cursor: loading ? "wait" : "pointer", transition: "border-color .15s" }}>
        {icon && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }} aria-hidden="true">{icon}</span>}
        <input ref={cb.inputRef} name="combobox-search" value={loading ? (placeholder ?? "") : cb.inputVal} readOnly={loading}
          onChange={(e) => { cb.setQuery(e.target.value); if (!cb.open) cb.setOpen(true); }}
          onFocus={() => { if (!loading && !cb.open) cb.openDropdown(); }} onKeyDown={cb.handleKeyDown}
          placeholder={loading ? "" : (cb.selectedLabel || placeholder)} aria-label={placeholder}
          aria-autocomplete="list" aria-controls={cb.listId} aria-activedescendant={cb.activeDId}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", minWidth: 0, color: cb.active ? (accentColor === "#818cf8" ? "#a5b4fc" : "#60a5fa") : "var(--text-2)", fontSize: 12, fontFamily: "Inter, sans-serif", cursor: loading ? "wait" : "text" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {cb.active && !loading && (<button onClick={cb.clear} aria-label="Clear selection" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: "0 2px", lineHeight: 1, fontSize: 13 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>)}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" aria-hidden="true" style={{ transform: cb.open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      {cb.open && (
        <div id={cb.listId} role="listbox" aria-label={placeholder} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 1000, background: "var(--bg-surface)", border: "1px solid var(--border-sub)", borderRadius: 8, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          {loading ? <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-4)" }}>{placeholder}...</div>
            : cb.filtered.length === 0 ? <div role="option" aria-selected="false" style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-4)" }}>No results</div>
            : cb.filtered.map((opt, i) => <DropdownItem key={opt.value} id={`${cb.listId}-opt-${i}`} opt={opt} value={value} accentColor={accentColor} onSelect={cb.select} isFocused={cb.focusedIndex === i} />)}
        </div>
      )}
    </div>
  );
}