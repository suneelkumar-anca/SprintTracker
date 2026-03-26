import { useState, useEffect, useRef, useId } from "react";

export function useCombobox({ options, value, onChange, placeholder, loading }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const uid = useId();
  const listId = `combobox-list-${uid}`;

  const selectedLabel = options.find((o) => String(o.value) === String(value))?.label ?? "";
  const inputVal = open ? query : selectedLabel;
  const filtered = query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;
  const active = !!value;

  const openDropdown = () => { if (!loading) { setOpen(true); setQuery(""); setFocusedIndex(-1); } };
  const closeDropdown = () => { setOpen(false); setQuery(""); setFocusedIndex(-1); };
  const select = (opt) => { onChange(String(opt.value)); closeDropdown(); inputRef.current?.focus(); };
  const clear = (e) => { e.stopPropagation(); onChange(""); closeDropdown(); };

  const handleKeyDown = (e) => {
    if (loading) return;
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); openDropdown(); } return; }
    if (e.key === "Escape") { e.preventDefault(); closeDropdown(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); return; }
    if (e.key === "Home") { e.preventDefault(); setFocusedIndex(0); return; }
    if (e.key === "End") { e.preventDefault(); setFocusedIndex(filtered.length - 1); return; }
    if (e.key === "Enter" && focusedIndex >= 0 && filtered[focusedIndex]) { e.preventDefault(); select(filtered[focusedIndex]); }
  };

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) closeDropdown(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeDId = focusedIndex >= 0 ? `${listId}-opt-${focusedIndex}` : undefined;

  return {
    ref, inputRef, listId, query, setQuery, open, setOpen, focusedIndex, activeDId,
    selectedLabel, inputVal, filtered, active,
    openDropdown, closeDropdown, select, clear, handleKeyDown,
  };
}
