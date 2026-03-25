import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  fetchTicket,
  fetchPullRequests,
  fetchSprintTickets,
  fetchKanbanTickets,
  fetchAllBoards,
  fetchBoardSprints,
  fetchComments,
  isJiraConfigured,
} from "./jira.js";
import { exportToExcel } from "./excel.js";
import { loadSavedReports, saveReport, deleteReport } from "./storage.js";

/*  THEME MANAGEMENT  */
const THEME_KEY = "sprint-tracker-theme";
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function resolveTheme(pref) { return pref === "system" ? getSystemTheme() : pref; }
function applyTheme(pref) {
  const r = resolveTheme(pref);
  document.documentElement.dataset.theme = r;
  document.documentElement.style.colorScheme = r;
}
function useThemePref() {
  const [pref, setPrefRaw] = useState(() => localStorage.getItem(THEME_KEY) ?? "dark");
  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [pref]);
  const setPref = (t) => { localStorage.setItem(THEME_KEY, t); setPrefRaw(t); };
  return [pref, setPref];
}

/*  STATUS CONFIG  */
function statusCfg(s) {
  const map = {
    "done":          { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   dot: "#22c55e" },
    "in progress":   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
    "in review":     { color: "#818cf8", bg: "rgba(129,140,248,0.12)", dot: "#818cf8" },
    "rejected":      { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
    "to do":         { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", dot: "var(--text-3)" },
    "not started":   { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", dot: "var(--text-3)" },
    "closed":        { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   dot: "#22c55e" },
    "resolved":      { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   dot: "#22c55e" },
    "open":          { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  dot: "#60a5fa" },
    "blocked":       { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
    "queued":        { color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  dot: "#38bdf8" },
    "ready for dev": { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  dot: "#60a5fa" },
    "backlog":       { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", dot: "var(--text-3)" },
    "cancelled":     { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
    "on hold":       { color: "#f97316", bg: "rgba(249,115,22,0.12)",  dot: "#f97316" },
    "testing":       { color: "#818cf8", bg: "rgba(129,140,248,0.12)", dot: "#818cf8" },
    "deployed":      { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   dot: "#22c55e" },
  };
  return map[(s ?? "").toLowerCase()] ?? { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", dot: "var(--text-3)" };
}

function prStatusCfg(s) {
  const map = {
    MERGED:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   label: "Merged"   },
    OPEN:     { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  label: "Open"     },
    DECLINED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   label: "Declined" },
  };
  return map[s] ?? { color: "var(--text-3)", bg: "rgba(100,116,139,0.12)", label: s ?? "PR" };
}

/*  HELPERS  */
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "\u2014";

const fmtFull = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";

function relativeDuration(start, end) {
  if (!start || !end) return null;
  const days = Math.round((new Date(end) - new Date(start)) / 86400000);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

/*  SEARCHABLE COMBOBOX  */
function Combobox({ options, value, onChange, placeholder, loading, icon, accentColor = "#3b82f6" }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef(null);

  // label of currently selected option
  const selectedLabel = options.find((o) => String(o.value) === String(value))?.label ?? "";
  // what to show in the input: typed query when open, label when closed
  const inputVal = open ? query : selectedLabel;

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (opt) => {
    onChange(String(opt.value));
    setQuery("");
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  };

  const active = !!value;
  const borderColor = active ? accentColor : open ? "var(--text-5)" : "var(--border-sub)";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Input row */}
      <div
        onClick={() => { if (!loading) { setOpen((v) => !v); if (!open) setQuery(""); } }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--bg)", border: `1px solid ${borderColor}`,
          borderRadius: 7, padding: "6px 8px 6px 28px",
          cursor: loading ? "wait" : "pointer", transition: "border-color .15s",
        }}>
        {icon && (
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
            pointerEvents: "none", display: "flex" }}>
            {icon}
          </span>
        )}
        <input
          name="combobox-search"
          value={loading ? (placeholder ?? "") : inputVal}
          readOnly={loading}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { if (!loading) setOpen(true); }}
          placeholder={loading ? "" : (selectedLabel || placeholder)}
          aria-label={placeholder}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: active ? (accentColor === "#818cf8" ? "#a5b4fc" : "#60a5fa") : "var(--text-2)",
            fontSize: 12, fontFamily: "Inter, sans-serif",
            cursor: loading ? "wait" : "text",
            minWidth: 0,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {active && !loading && (
            <button onClick={clear} aria-label="Clear selection"
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "var(--text-4)", padding: "0 2px", lineHeight: 1, fontSize: 13 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 1000,
          background: "var(--bg-surface)", border: "1px solid var(--border-sub)", borderRadius: 8,
          maxHeight: 220, overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {loading ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-4)" }}>{placeholder}\u2026</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-4)" }}>No results</div>
          ) : (
            filtered.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div key={opt.value} onClick={() => select(opt)}
                  style={{
                    padding: "8px 12px", fontSize: 12, cursor: "pointer",
                    color: isSelected ? (accentColor === "#818cf8" ? "#a5b4fc" : "#60a5fa") : "var(--text-mid)",
                    background: isSelected ? `${accentColor}18` : "transparent",
                    borderLeft: isSelected ? `2px solid ${accentColor}` : "2px solid transparent",
                    transition: "background .1s",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-raised)"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                    {opt.label}
                  </span>
                  {opt.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                      background: opt.badge === "active" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)",
                      color: opt.badge === "active" ? "#22c55e" : "var(--text-3)",
                      textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
                    }}>{opt.badge}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/*  SKELETON LOADER  */
function Skeleton({ w = "100%", h = 14, radius = 6 }) {
  return (
    <div
      aria-hidden="true"
      style={{ width: w, height: h, borderRadius: radius, background: "var(--border-sub)", animation: "shimmer 1.5s ease-in-out infinite" }}
    />
  );
}

/*  STATUS BADGE  */
function StatusBadge({ status }) {
  const cfg = statusCfg(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, border: `1px solid ${cfg.color}30`,
      borderRadius: 6, padding: "3px 9px",
      color: cfg.color, fontSize: 11, fontWeight: 600,
      letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {status ?? "Unknown"}
    </span>
  );
}

/*  TIMELINE BAR  */
function TimelineBar({ startDate, endDate }) {
  const now = new Date();
  const s = new Date(startDate);
  const e = new Date(endDate);
  const total = e - s;
  const progPct = total > 0 ? Math.min(100, Math.max(0, ((now - s) / total) * 100)) : 0;
  const days = relativeDuration(startDate, endDate);
  const overdue = now > e;

  return (
    <div>
      <div style={{ position: "relative", height: 8, background: "var(--bg-elevated)", borderRadius: 4, overflow: "visible" }}>
        <div style={{
          position: "absolute", left: 0, width: `${progPct}%`, height: "100%",
          background: overdue
            ? "linear-gradient(90deg,#ef4444,#f87171)"
            : "linear-gradient(90deg,#3b82f6,#818cf8)",
          borderRadius: 4, transition: "width .8s ease",
        }} />
        {progPct > 0 && progPct < 100 && (
          <div style={{
            position: "absolute", left: `${progPct}%`,
            top: -4, width: 2, height: 16,
            background: "#f59e0b", borderRadius: 1,
            transform: "translateX(-50%)",
          }} />
        )}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 8,
        fontSize: 11, color: "var(--text-4)", fontFamily: "'JetBrains Mono',monospace",
      }}>
        <span>{fmt(startDate)}</span>
        <span style={{ color: overdue ? "#ef4444" : "var(--text-3)" }}>
          {days}{overdue ? "  overdue" : ""}
        </span>
        <span>{fmt(endDate)}</span>
      </div>
    </div>
  );
}

/*  SECTION WRAPPER  */
function Section({ label, icon, children, noBorder = false }) {
  return (
    <div style={{ padding: "18px 24px", borderBottom: noBorder ? "none" : "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        {icon && <span style={{ opacity: 0.4 }}>{icon}</span>}
        <span style={{
          fontSize: 10, color: "var(--text-4)", textTransform: "uppercase",
          letterSpacing: "0.1em", fontWeight: 600,
        }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

/*  AVATAR IMG — falls back to initials when image errors (CORB / CDN auth redirect) */
function AvatarImg({ src, name, size = 34, radius = 9, fontSize = 14 }) {
  const [failed, setFailed] = React.useState(false);
  const initial = (name ?? "?")[0].toUpperCase();
  const baseStyle = { width: size, height: size, borderRadius: radius, flexShrink: 0 };
  if (!src || failed) {
    return (
      <div style={{ ...baseStyle, background: "var(--border-sub)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#60a5fa", fontSize, fontWeight: 700 }}>
        {initial}
      </div>
    );
  }
  return (
    <img src={src} alt={name} referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ ...baseStyle, objectFit: "cover", border: "2px solid var(--border-sub)" }} />
  );
}

/*  ASSIGNEE AVATAR  */
function AssigneeCard({ name, avatarUrl, email }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <AvatarImg src={avatarUrl} name={name} size={34} radius={9} fontSize={14} />
      <div>
        <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{name ?? "Unassigned"}</div>
        {email && <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1 }}>{email}</div>}
      </div>
    </div>
  );
}

/*  PR CARD  */
function PRCard({ pr }) {
  const cfg = prStatusCfg(pr.status);
  const [hov, setHov] = useState(false);
  return (
    <a href={pr.url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: hov ? "var(--bg-raised)" : "var(--bg-surface)",
        border: "1px solid var(--border-sub)", borderRadius: 10,
        padding: "12px 16px", cursor: "pointer",
        textDecoration: "none", transition: "background .15s",
        gap: 12,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
          <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
          <path d="M6 9v6" /><path d="M15.7 6.6A9 9 0 019 9v5.4" />
        </svg>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "'JetBrains Mono',monospace",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pr.name || pr.id}
          </div>
          {(pr.author || pr.repo) && (
            <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
              {[pr.author, pr.repo].filter(Boolean).join("  ")}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 5,
          background: cfg.bg, color: cfg.color,
        }}>{cfg.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="2">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    </a>
  );
}

/*  PILL  */
function Pill({ children, color = "var(--text-3)", bg = "rgba(100,116,139,0.1)" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: bg, border: `1px solid ${color}30`,
      borderRadius: 6, padding: "3px 9px",
      color, fontSize: 11, fontWeight: 500,
    }}>{children}</span>
  );
}

/* -- COMMENTS SECTION ------------------------------------------------------------ */
function CommentsSection({ tlComment, comments, commentsLoading }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* TL custom-field comment (read-only) */}
      {tlComment && (
        <div style={{
          background: "var(--bg-nav)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-5)", marginBottom: 6,
            textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            TL Field
          </div>
          <p style={{ fontSize: 14, color: "var(--text-mid)", lineHeight: 1.75, margin: 0, fontStyle: "italic" }}>
            "{tlComment}"
          </p>
        </div>
      )}

      {/* Jira comments */}
      {commentsLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton h={56} radius={10} /><Skeleton h={56} radius={10} />
        </div>
      ) : comments.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comments.map((c) => (
            <div key={c.id} style={{
              background: "var(--bg-nav)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <AvatarImg src={c.avatar} name={c.author} size={24} radius={6} fontSize={10} />
                <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>{c.author}</span>
                <span style={{ fontSize: 11, color: "var(--text-5)", marginLeft: "auto",
                  fontFamily: "'JetBrains Mono',monospace" }}>{fmt(c.created)}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.65, margin: 0 }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      ) : !tlComment ? (
        <span style={{ fontSize: 13, color: "var(--text-5)" }}>No comments on this ticket yet.</span>
      ) : null}

    </div>
  );
}

/*  TICKET DETAIL CARD  */
function TicketCard({ ticket, prs, prsLoading, comments, commentsLoading }) {
  const [show, setShow] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 40); return () => clearTimeout(t); }, []);
  const cfg = statusCfg(ticket.status);

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 18, overflow: "hidden",
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0) scale(1)" : "translateY(20px) scale(0.99)",
      transition: "opacity .4s ease, transform .4s ease",
      boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}40)` }} />

      {/* Header */}
      <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {ticket.issueTypeIcon && (
            <img src={ticket.issueTypeIcon} alt={ticket.issueType} width={16} height={16}
              referrerPolicy="no-referrer"
              style={{ borderRadius: 3, opacity: 0.8 }} />
          )}
          {ticket.issueType && (
            <Pill color="var(--text-2)" bg="rgba(148,163,184,0.08)">{ticket.issueType}</Pill>
          )}
          <a href={ticket.jiraUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#3b82f6",
              fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={e => e.currentTarget.style.color = "#60a5fa"}
            onMouseLeave={e => e.currentTarget.style.color = "#3b82f6"}>
            {ticket.id} 
          </a>
          <span style={{ color: "var(--border)" }}></span>
          <StatusBadge status={ticket.status} />
          {ticket.sprintName && (
            <>
              <span style={{ color: "var(--border)" }}></span>
              <span style={{ fontSize: 11, color: "var(--text-4)", background: "var(--bg-elevated)",
                border: "1px solid var(--border-sub)", borderRadius: 5, padding: "2px 8px" }}>
                {ticket.sprintName}
              </span>
            </>
          )}
          {ticket.priority && (
            <Pill color="#f59e0b" bg="rgba(245,158,11,0.1)">{ticket.priority}</Pill>
          )}
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: "var(--text-hi)",
          lineHeight: 1.4, margin: 0, letterSpacing: "-0.4px" }}>
          {ticket.description}
        </h2>
        {ticket.descriptionBody && (
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
            {descExpanded ? ticket.descriptionBody : ticket.descriptionBody.slice(0, 300)}
            {ticket.descriptionBody.length > 300 && (
              <button onClick={() => setDescExpanded(v => !v)}
                style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer",
                  color: "#3b82f6", fontSize: 12, fontWeight: 600, padding: 0 }}>
                {descExpanded ? "Show less" : "\u25bc Show more"}
              </button>
            )}
          </p>
        )}
        {(ticket.labels?.length > 0 || ticket.components?.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {ticket.labels.map(l => <Pill key={l} color="#818cf8" bg="rgba(129,140,248,0.08)">{l}</Pill>)}
            {ticket.components.map(c => <Pill key={c} color="#34d399" bg="rgba(52,211,153,0.08)">{c}</Pill>)}
          </div>
        )}
      </div>

      {/* Meta grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        borderBottom: "1px solid var(--border)", background: "var(--bg-nav)" }}>
        {[
          { label: "Assignee",
            content: <AssigneeCard name={ticket.assigneeName} avatarUrl={ticket.assigneeAvatar} email={ticket.assigneeEmail} /> },
          { label: "Story Points",
            content: Number.isFinite(ticket.sp) ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: "#3b82f6",
                  fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{ticket.sp}</span>
                <span style={{ fontSize: 12, color: "var(--text-4)" }}>pts</span>
              </div>
            ) : <span style={{ fontSize: 14, color: "var(--text-5)" }}>\u2014</span> },
          { label: "Created",
            content: (
              <div>
                <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{fmtFull(ticket.created)}</div>
                {ticket.reporter && <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>by {ticket.reporter}</div>}
                {ticket.updated && ticket.updated !== ticket.created && (
                  <div style={{ fontSize: 11, color: "var(--text-5)", marginTop: 4 }}>Updated {fmtFull(ticket.updated)}</div>
                )}
              </div>
            ) },
        ].map(({ label, content }, i) => (
          <div key={label} style={{ padding: "16px 20px", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
            <div style={{ fontSize: 10, color: "var(--text-5)", textTransform: "uppercase",
              letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10 }}>{label}</div>
            {content}
          </div>
        ))}
      </div>

      {/* Timeline */}
      <Section label="Sprint Timeline" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>
        {ticket.startDate && ticket.endDate ? (
          <TimelineBar startDate={ticket.startDate} endDate={ticket.endDate} />
        ) : (
          <span style={{ fontSize: 13, color: "var(--text-5)" }}>No date information available from Jira.</span>
        )}
      </Section>

      {/* Artifacts � derived from live PR data */}
      <Section label="Artifacts" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>

          {/* PR presence badge � derived from fetched PR list */}
          {prsLoading ? (
            <Skeleton w={100} h={32} radius={8} />
          ) : (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: prs.length > 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${prs.length > 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: 8, padding: "7px 13px",
              color: prs.length > 0 ? "#22c55e" : "#ef4444",
              fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
            }}>
              {prs.length > 0 ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {prs.length} PR{prs.length > 1 ? "s" : ""} linked
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  No PR
                </>
              )}
            </span>
          )}

          {/* Merged / Open breakdown */}
          {!prsLoading && prs.length > 0 && (() => {
            const merged = prs.filter(p => p.status === "MERGED").length;
            const open   = prs.filter(p => p.status === "OPEN").length;
            return (
              <>
                {merged > 0 && <Pill color="#818cf8" bg="rgba(129,140,248,0.08)">{merged} merged</Pill>}
                {open   > 0 && <Pill color="#3b82f6" bg="rgba(59,130,246,0.08)">{open} open</Pill>}
              </>
            );
          })()}

          {/* Custom artifacts field if populated */}
          {ticket.artifacts && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 8, padding: "7px 13px", color: "#818cf8", fontSize: 13,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/>
              </svg>
              {ticket.artifacts}
            </span>
          )}
        </div>
      </Section>

      {/* TL Comments � Jira comments + inline add form */}
      <Section label="Comments" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}>
        <CommentsSection
          tlComment={ticket.tlComment}
          comments={comments}
          commentsLoading={commentsLoading}
        />
      </Section>

      {/* Time Spent */}
      {ticket.timeSpent && (
        <Section label="Time Spent" noBorder icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{ticket.timeSpent}</span>
        </Section>
      )}

      {/* Pull Requests */}
      <Section label="Pull Requests    Bitbucket" noBorder icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M6 9v6"/><path d="M15.7 6.6A9 9 0 019 9v5.4"/></svg>}>
        {prsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton h={52} radius={10} /><Skeleton h={52} radius={10} />
          </div>
        ) : prs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prs.map((pr) => <PRCard key={pr.id} pr={pr} />)}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: "var(--text-5)" }}>
            No linked pull requests found. <a href={ticket.jiraUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: "#3b82f6", textDecoration: "none" }}>Open in Jira </a>
          </span>
        )}
      </Section>
    </div>
  );
}

/*  TICKET ROW � compact 2-line card  */
function TicketRow({ ticket, onSelect, isActive }) {
  const [hov, setHov] = useState(false);
  const cfg = statusCfg(ticket.status);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Load ticket ${ticket.id}: ${ticket.description}`}
      aria-pressed={isActive}
      onClick={() => onSelect(ticket.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(ticket.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "9px 14px 8px 12px",
        cursor: "pointer",
        background: isActive ? "rgba(59,130,246,0.07)" : hov ? "var(--bg-card)" : "transparent",
        borderBottom: "1px solid #0d1626",
        borderLeft: `3px solid ${isActive ? "#3b82f6" : cfg.color + "60"}`,
        transition: "background .12s",
      }}>
      {/* Row 1: ID � status pill � avatar � SP */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
          color: isActive ? "#60a5fa" : "#3b82f6", fontWeight: 700, flexShrink: 0 }}>
          {ticket.id}
        </span>
        <span style={{ flex: 1 }} />
        {/* Compact status pill */}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
          textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
          maxWidth: 94, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }} title={ticket.status}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
          {ticket.status ?? "Unknown"}
        </span>
        {/* Avatar */}
        <AvatarImg src={ticket.assigneeAvatar} name={ticket.assigneeName} size={22} radius={6} fontSize={9} />
        {/* SP badge */}
        <span style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700,
          color: Number.isFinite(ticket.sp) ? "#a78bfa" : "var(--border-act)",
          background: Number.isFinite(ticket.sp) ? "rgba(167,139,250,0.12)" : "transparent",
          border: `1px solid ${Number.isFinite(ticket.sp) ? "rgba(167,139,250,0.25)" : "var(--border)"}`,
          padding: "2px 5px", borderRadius: 4, minWidth: 22, textAlign: "center", flexShrink: 0,
        }} title="Story Points">
          {Number.isFinite(ticket.sp) ? ticket.sp : "—"}
        </span>
      </div>
      {/* Row 2: full ticket title */}
      <div style={{ fontSize: 12, color: isActive ? "var(--text-mid)" : "var(--text-3)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 2 }}>
        {ticket.description
          ? ticket.description
          : <span style={{ fontStyle: "italic", color: "var(--text-5)" }}>No summary</span>}
      </div>
    </div>
  );
}

/*  SETUP BANNER  */
function SetupBanner() {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(129,140,248,0.08))",
      border: "1px solid rgba(59,130,246,0.2)", borderRadius: 14,
      padding: "28px 32px", marginBottom: 32,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>
            Connect to Jira to load real data
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 16px", lineHeight: 1.7 }}>
            Create a <code style={{ background: "var(--border-sub)", padding: "1px 6px", borderRadius: 4, color: "#818cf8" }}>.env</code> file in the project root:
          </p>
          <div style={{
            background: "var(--bg)", border: "1px solid var(--border-sub)", borderRadius: 10,
            padding: "16px 20px", fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
            color: "var(--text-2)", lineHeight: 2,
          }}>
            <div><span style={{ color: "var(--text-4)" }}># Required</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_JIRA_BASE_URL</span>=<span style={{ color: "#34d399" }}>https://yourcompany.atlassian.net</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_JIRA_EMAIL</span>=<span style={{ color: "#34d399" }}>your@email.com</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_JIRA_API_TOKEN</span>=<span style={{ color: "#34d399" }}>your-api-token</span></div>
            <div style={{ marginTop: 8 }}><span style={{ color: "var(--text-4)" }}># Optional</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_JIRA_PROJECT_KEY</span>=<span style={{ color: "#34d399" }}>TR</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_JIRA_SPRINT_ID</span>=<span style={{ color: "#34d399" }}>44</span></div>
            <div><span style={{ color: "#818cf8" }}>VITE_OPENAI_API_KEY</span>=<span style={{ color: "#34d399" }}>sk-...</span></div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-5)", margin: "12px 0 0" }}>
            Get your API token: atlassian.com &#8594; Account settings &#8594; Security &#8594; API tokens
          </p>
        </div>
      </div>
    </div>
  );
}

/*  EMPTY STATE  */
function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "64px 24px" }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--bg-elevated)",
        border: "1px solid var(--border-sub)", display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-4)", margin: 0 }}>
        Enter a Jira ticket ID above to load its details.
      </p>
      <p style={{ fontSize: 12, color: "var(--text-5)", margin: "6px 0 0" }}>e.g. TR-38275, PROJ-123</p>
    </div>
  );
}

/*  DASHBOARD VIEW  */
function DashboardView({ sprintTickets, sprintLoaded, sprintLoading, currentSprintName, sprint, onSelectTicket }) {
  if (sprintLoading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"
          style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 16px", display: "block" }}>
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <p style={{ fontSize: 13, color: "var(--text-4)", margin: 0 }}>Loading sprint data\u2026</p>
      </div>
    );
  }
  if (!sprintLoaded || sprintTickets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--bg-surface)",
          border: "1px solid var(--border)", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-5)" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-4)", margin: 0 }}>Select a board &amp; sprint to view the team dashboard.</p>
      </div>
    );
  }

  // Build per-person stats
  const allStatuses = [...new Set(sprintTickets.map(t => t.status).filter(Boolean))];
  const people = {};
  for (const t of sprintTickets) {
    const name = t.assigneeName ?? "Unassigned";
    if (!people[name]) {
      people[name] = {
        name,
        avatar: t.assigneeAvatar,
        tickets: [],
        totalSP: 0,
        doneSP: 0,
        statusCounts: {},
      };
    }
    people[name].tickets.push(t);
    const sp = Number.isFinite(t.sp) ? t.sp : 0;
    people[name].totalSP += sp;
    if ((t.status ?? "").toLowerCase() === "done") people[name].doneSP += sp;
    people[name].statusCounts[t.status ?? "Unknown"] =
      (people[name].statusCounts[t.status ?? "Unknown"] ?? 0) + 1;
  }

  const sorted = Object.values(people).sort((a, b) => b.tickets.length - a.tickets.length);
  const totalTickets = sprintTickets.length;
  const doneAll = sprintTickets.filter(t => (t.status ?? "").toLowerCase() === "done").length;
  const totalSPAll = sprintTickets.reduce((s, t) => s + (Number.isFinite(t.sp) ? t.sp : 0), 0);

  // Sprint timeline helpers
  const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;
  const sprintStart = fmtD(sprint?.startDate);
  const sprintEnd   = fmtD(sprint?.endDate);
  const sprintState = sprint?.state ?? null;
  const today = new Date();
  let daysLeft = null, daysOverdue = null, progressPct = 0;
  if (sprint?.startDate && sprint?.endDate) {
    const start = new Date(sprint.startDate);
    const end   = new Date(sprint.endDate);
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const elapsed   = Math.round((today - start) / 86400000);
    progressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
    if (today > end) daysOverdue = Math.round((today - end) / 86400000);
    else daysLeft = Math.max(0, Math.round((end - today) / 86400000));
  }
  const stateColor = sprintState === "active" ? "#22c55e" : sprintState === "future" ? "#60a5fa" : "var(--text-3)";

  return (
    <div>
      {/* Dashboard header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-hi)", margin: 0, letterSpacing: "-0.4px" }}>
                Team Contributions
              </h2>
              {sprintState && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                  background: `${stateColor}18`, color: stateColor, border: `1px solid ${stateColor}30`,
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {sprintState}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-4)", margin: "0 0 10px" }}>
              {currentSprintName} &nbsp;&middot;&nbsp; {sorted.length} contributors &nbsp;&middot;&nbsp; {totalTickets} tickets &nbsp;&middot;&nbsp; {doneAll} done
            </p>

            {/* Sprint date strip */}
            {(sprintStart || sprintEnd) && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {sprintStart && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>Start</span>
                    <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "'JetBrains Mono',monospace" }}>{sprintStart}</span>
                  </div>
                )}
                {sprintEnd && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>End</span>
                    <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "'JetBrains Mono',monospace" }}>{sprintEnd}</span>
                  </div>
                )}
                {daysOverdue != null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                    borderRadius: 5, padding: "2px 7px" }}>
                    {daysOverdue}d overdue
                  </span>
                )}
                {daysLeft != null && daysOverdue == null && (
                  <span style={{ fontSize: 11, fontWeight: 600,
                    color: daysLeft <= 2 ? "#f59e0b" : "#22c55e",
                    background: daysLeft <= 2 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
                    border: `1px solid ${daysLeft <= 2 ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.15)"}`,
                    borderRadius: 5, padding: "2px 7px" }}>
                    {daysLeft}d remaining
                  </span>
                )}
              </div>
            )}

            {/* Sprint time progress bar */}
            {sprint?.startDate && sprint?.endDate && (
              <div style={{ marginTop: 10, width: 320 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>Time elapsed</span>
                  <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-4)" }}>{progressPct}%</span>
                </div>
                <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 3,
                    background: daysOverdue ? "#ef4444" : "linear-gradient(90deg,#3b82f6,#818cf8)",
                    transition: "width .4s" }} />
                </div>
              </div>
            )}
          </div>
          {/* Sprint-level SP bar */}
          {totalSPAll > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>Sprint SP</span>
              <div style={{ width: 160, height: 8, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (sprintTickets.filter(t=>(t.status??"").toLowerCase()==="done").reduce((s,t)=>s+(Number.isFinite(t.sp)?t.sp:0),0)/totalSPAll)*100)}%`,
                  height: "100%", background: "linear-gradient(90deg,#3b82f6,#818cf8)", borderRadius: 4, transition: "width .4s" }} />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#818cf8" }}>
                {sprintTickets.filter(t=>(t.status??"").toLowerCase()==="done").reduce((s,t)=>s+(Number.isFinite(t.sp)?t.sp:0),0)}/{totalSPAll} sp
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Person cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {sorted.map((p) => {
          const doneCount = p.tickets.filter(t => (t.status ?? "").toLowerCase() === "done").length;
          const completionPct = p.tickets.length > 0 ? Math.round((doneCount / p.tickets.length) * 100) : 0;
          const spPct = p.totalSP > 0 ? Math.round((p.doneSP / p.totalSP) * 100) : 0;
          return (
            <div key={p.name} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 16, overflow: "hidden" }}>

              {/* Card header */}
              <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid #0d1626",
                display: "flex", alignItems: "center", gap: 12 }}>
                <AvatarImg src={p.avatar} name={p.name} size={40} radius={12} fontSize={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                    {p.tickets.length} ticket{p.tickets.length !== 1 ? "s" : ""}
                    {p.totalSP > 0 ? ` � ${p.totalSP} SP` : ""}
                  </div>
                </div>
                {/* Completion % badge */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
                    color: completionPct === 100 ? "#22c55e" : completionPct >= 50 ? "#f59e0b" : "#60a5fa" }}>
                    {completionPct}%
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>done</div>
                </div>
              </div>

              {/* Progress bars */}
              <div style={{ padding: "12px 18px", borderBottom: "1px solid #0d1626", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Tickets</span>
                    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-3)" }}>{doneCount}/{p.tickets.length}</span>
                  </div>
                  <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${completionPct}%`, height: "100%",
                      background: "linear-gradient(90deg,#3b82f6,#60a5fa)", borderRadius: 3, transition: "width .4s" }} />
                  </div>
                </div>
                {p.totalSP > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Story Points</span>
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--text-3)" }}>{p.doneSP}/{p.totalSP} sp</span>
                    </div>
                    <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${spPct}%`, height: "100%",
                        background: "linear-gradient(90deg,#818cf8,#a78bfa)", borderRadius: 3, transition: "width .4s" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Status breakdown chips */}
              <div style={{ padding: "10px 18px", borderBottom: "1px solid #0d1626",
                display: "flex", gap: 5, flexWrap: "wrap" }}>
                {Object.entries(p.statusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const cfg = statusCfg(status);
                    return (
                      <span key={status} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
                        textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />
                        {status} \u00b7 {count}
                      </span>
                    );
                  })}
              </div>

              {/* Ticket list */}
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {p.tickets.map((t) => {
                  const cfg = statusCfg(t.status);
                  return (
                    <div key={t.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Load ticket ${t.id}: ${t.description}`}
                      onClick={() => onSelectTicket(t.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectTicket(t.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 18px", borderBottom: "1px solid #080e1b",
                        cursor: "pointer", transition: "background .1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                        color: "#3b82f6", fontWeight: 700, flexShrink: 0, minWidth: 70 }}>{t.id}</span>
                      <span style={{ flex: 1, fontSize: 11, color: "var(--text-3)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.description || "No summary"}
                      </span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 3,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
                        textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
                        maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={t.status}>{t.status ?? "?"}</span>
                      {Number.isFinite(t.sp) && (
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
                          color: "#a78bfa", background: "rgba(167,139,250,0.1)",
                          border: "1px solid rgba(167,139,250,0.2)",
                          padding: "1px 5px", borderRadius: 3, flexShrink: 0 }}>{t.sp}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/*  MAIN APP  */
export default function App() {
  const [activeView,         setActiveView]         = useState("tracker"); // "tracker" | "dashboard"
  const [query,              setQuery]              = useState("");
  const [ticket,             setTicket]             = useState(null);
  const [prs,                setPrs]                = useState([]);
  const [loading,            setLoading]            = useState(false);
  const [prsLoading,         setPrsLoading]         = useState(false);
  const [error,              setError]              = useState("");
  const [comments,           setComments]           = useState([]);
  const [commentsLoading,    setCommentsLoading]    = useState(false);
  const [sprintTickets,      setSprintTickets]      = useState([]);
  const [sprintLoading,      setSprintLoading]      = useState(false);
  const [sprintLoaded,       setSprintLoaded]       = useState(false);
  const [sprintError,        setSprintError]        = useState("");
  const [pendingLookup,      setPendingLookup]      = useState(null);

  // Sprint management
  const [boards,             setBoards]             = useState([]);
  const [boardsLoading,      setBoardsLoading]      = useState(false);
  const [selectedBoardId,    setSelectedBoardId]    = useState(
    import.meta.env.VITE_JIRA_BOARD_ID ?? ""
  );
  const [selectedBoardType,  setSelectedBoardType]  = useState("scrum"); // "scrum" | "kanban"
  const [boardSprints,       setBoardSprints]       = useState([]);
  const [sprintsLoading,     setSprintsLoading]     = useState(false);
  const [selectedSprintId,   setSelectedSprintId]   = useState("");

  // Filters
  const [filterAssignee,     setFilterAssignee]     = useState("");
  const [filterStatus,       setFilterStatus]       = useState("");
  const [filterStart,        setFilterStart]        = useState("");
  const [filterEnd,          setFilterEnd]          = useState("");

  // Saved reports
  const [savedReports,       setSavedReports]       = useState([]);
  const [showSaved,          setShowSaved]          = useState(false);

  const configured = isJiraConfigured();
  const [themePref, setThemePref] = useThemePref();
  const isDark = resolveTheme(themePref) === "dark";

  // Fetch all accessible boards once on mount; retry once on failure
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    setBoardsLoading(true);
    const load = () => fetchAllBoards().then((list) => {
      if (cancelled) return;
      setBoards(list);
      // If we got nothing, try once more after a short delay (transient network blip)
      if (list.length === 0) {
        setTimeout(() => {
          if (cancelled) return;
          fetchAllBoards().then((retry) => { if (!cancelled) setBoards(retry); });
        }, 1500);
      }
    }).finally(() => { if (!cancelled) setBoardsLoading(false); });
    load();
    return () => { cancelled = true; };
  }, [configured]);

  // When the selected board changes, either load sprints (scrum) or tickets directly (kanban)
  useEffect(() => {
    if (!configured || !selectedBoardId) {
      setBoardSprints([]);
      setSelectedBoardType("scrum");
      return;
    }

    // Derive the type from the boards list
    const boardObj = boards.find((b) => String(b.id) === String(selectedBoardId));
    const bType = boardObj?.type ?? "scrum";
    setSelectedBoardType(bType);

    if (bType === "kanban") {
      // Kanban boards have no sprints � clear sprint state and load tickets directly
      setBoardSprints([]);
      setSelectedSprintId("");
      setTicket(null); setPrs([]); setComments([]);
      setQuery(""); setError(""); setSprintError("");
      setFilterAssignee(""); setFilterStatus(""); setFilterStart(""); setFilterEnd("");
      setSprintLoading(true); setSprintLoaded(false); setSprintTickets([]);
      fetchKanbanTickets(selectedBoardId)
        .then((list) => {
          setSprintTickets(list);
          setSprintLoaded(true);
        })
        .catch((err) => { setSprintError(err?.message ?? "Failed to load board tickets."); setSprintLoaded(true); })
        .finally(() => setSprintLoading(false));
    } else {
      // Scrum board � fetch sprints and auto-select the active one
      setSprintsLoading(true);
      setBoardSprints([]);
      fetchBoardSprints(selectedBoardId)
        .then((sprints) => {
          setBoardSprints(sprints);
          const active = sprints.find((s) => s.state === "active");
          setSelectedSprintId(active ? String(active.id) : "");
        })
        .finally(() => setSprintsLoading(false));
    }
  }, [configured, selectedBoardId, boards]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Load saved reports from localStorage on mount
  useEffect(() => {
    setSavedReports(loadSavedReports());
  }, []);

  // Reload sprint tickets whenever selectedSprintId changes.
  // Only fires when a sprint is explicitly selected � avoids spurious API calls.
  useEffect(() => {
    if (!configured || !selectedSprintId) return;
    // Clear stale ticket detail from a previous sprint
    setTicket(null);
    setPrs([]);
    setComments([]);
    setQuery("");
    setError("");
    setSprintLoading(true);
    setSprintLoaded(false);
    setSprintError("");
    setFilterAssignee("");
    setFilterStatus("");
    setFilterStart("");
    setFilterEnd("");
    fetchSprintTickets(selectedSprintId)
      .then((list) => {
        setSprintTickets(list);
        setSprintLoaded(true);
      })
      .catch((err) => { setSprintError(err?.message ?? "Failed to load sprint tickets."); setSprintLoaded(true); })
      .finally(() => setSprintLoading(false));
  }, [configured, selectedSprintId]);

  const lookup = useCallback(async (id) => {
    const key = ((id ?? query) + "").trim().toUpperCase();
    if (!key) return;
    setLoading(true);
    setError("");
    setTicket(null);
    setPrs([]);
    setComments([]);
    try {
      const t = await fetchTicket(key);
      setTicket(t);
      setQuery(t.id);
      setLoading(false);

      // Fetch PRs using the numeric ID already embedded in the ticket response
      // (avoids a second round-trip and prevents the string-key fallback bug)
      setPrsLoading(true);
      fetchPullRequests(t.numericId).then(setPrs).finally(() => setPrsLoading(false));

      // Fetch Jira comments
      setCommentsLoading(true);
      fetchComments(key).then(setComments).finally(() => setCommentsLoading(false));

    } catch (err) {
      setError(err.message ?? "Failed to fetch ticket.");
      setLoading(false);
    }
  }, [query]);

  // Fire lookup after view switch — avoids setTimeout timing hack
  useEffect(() => {
    if (pendingLookup && activeView === "tracker") {
      setPendingLookup(null);
      lookup(pendingLookup);
    }
  }, [pendingLookup, activeView, lookup]);

  /* Post a comment and refresh the comment list */
  // Commenting disabled � read-only view only.

  const clearAll = () => { setQuery(""); setTicket(null); setPrs([]); setError(""); setComments([]); };

  // Derived filter options
  const uniqueAssignees = useMemo(() =>
    [...new Set(sprintTickets.map((t) => t.assigneeName).filter(Boolean))].sort(),
    [sprintTickets]);
  const uniqueStatuses = useMemo(() =>
    [...new Set(sprintTickets.map((t) => t.status).filter(Boolean))].sort(),
    [sprintTickets]);

  // Filtered ticket list for the sprint panel
  const filteredTickets = useMemo(() => {
    return sprintTickets.filter((t) => {
      if (filterAssignee && t.assigneeName !== filterAssignee) return false;
      if (filterStatus && (t.status ?? "").toLowerCase() !== filterStatus.toLowerCase()) return false;
      // Date range filters on ticket created date
      if (filterStart && (!t.created || t.created < filterStart)) return false;
      if (filterEnd   && (!t.created || t.created > filterEnd))   return false;
      return true;
    });
  }, [sprintTickets, filterAssignee, filterStatus, filterStart, filterEnd]);

  const hasActiveFilters = filterAssignee || filterStatus || filterStart || filterEnd;

  // Save current sprint to localStorage
  const saveCurrentSprint = () => {
    if (!sprintLoaded || sprintTickets.length === 0) return;
    const sprintName = sprintTickets[0]?.sprintName ?? `Sprint ${selectedSprintId || "Active"}`;
    const report = {
      id: `${Date.now()}`,
      name: sprintName,
      sprintId: selectedSprintId,
      savedAt: new Date().toISOString(),
      tickets: sprintTickets,
    };
    saveReport(report);
    setSavedReports(loadSavedReports());
  };

  // Export current (filtered) sprint to Excel
  const exportCurrentSprint = () => {
    const sprintName = sprintTickets[0]?.sprintName ?? `Sprint_${selectedSprintId || "Active"}`;
    exportToExcel(filteredTickets, sprintName);
  };

  // Load a saved report into the sprint panel (offline view)
  const loadSavedReport = (report) => {
    setSprintTickets(report.tickets);
    setSprintLoaded(true);
    setSprintLoading(false);
    setFilterAssignee("");
    setFilterStatus("");
    setFilterStart("");
    setFilterEnd("");
    setShowSaved(false);
  };

  // Remove a saved report
  const removeSavedReport = (id) => {
    deleteReport(id);
    setSavedReports(loadSavedReports());
  };

  const totalTickets = sprintTickets.length;
  const doneCount    = sprintTickets.filter(t => t.status?.toLowerCase() === "done").length;
  const totalSP      = sprintTickets.reduce((s, t) => s + (Number.isFinite(t.sp) ? t.sp : 0), 0);
  const doneSP       = sprintTickets.filter(t => t.status?.toLowerCase() === "done").reduce((s, t) => s + (Number.isFinite(t.sp) ? t.sp : 0), 0);
  const currentSprintName = sprintTickets[0]?.sprintName
    ?? boardSprints.find((s) => String(s.id) === String(selectedSprintId))?.name
    ?? "Active";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Inter, sans-serif", color: "var(--text)" }}>

      {/* Nav */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-nav)",
        position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Logo mark */}
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#1d4ed8,#4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(99,102,241,0.35), 0 4px 12px rgba(59,130,246,0.3)",
              flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                {/* top-left: solid square = board */}
                <rect x="1" y="1" width="7" height="7" rx="1.8" fill="#fff" opacity="0.95"/>
                {/* top-right: 3 stacked lines = sprint list */}
                <rect x="10" y="2" width="7" height="1.6" rx="0.8" fill="#fff" opacity="0.9"/>
                <rect x="10" y="4.7" width="5" height="1.6" rx="0.8" fill="#fff" opacity="0.65"/>
                <rect x="10" y="7.4" width="6" height="1.6" rx="0.8" fill="#fff" opacity="0.45"/>
                {/* bottom: checkmark = done */}
                <rect x="1" y="11" width="16" height="6" rx="1.8" fill="#fff" opacity="0.15"/>
                <polyline points="3.5,14 6,16.2 10.5,11.5" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", letterSpacing: "-0.2px" }}>Sprint Tracker</span>
              <span style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.02em" }}>Jira Report Reviewer</span>
            </div>
            <span style={{ fontSize: 9, color: "var(--text-3)", background: "var(--bg-elevated)",
              border: "1px solid var(--border-sub)", borderRadius: 4, padding: "2px 6px",
              fontFamily: "'JetBrains Mono',monospace", marginLeft: 2 }}>v1.0</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Status beacon */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12,
              color: configured ? "#22c55e" : "var(--text-2)" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%",
                background: configured ? "#22c55e" : "var(--border-act)",
                boxShadow: configured ? "0 0 6px #22c55e80" : "none" }} />
              {configured ? "Jira connected" : "Jira not configured"}
            </div>

            {/* Theme toggle � Light / Dark / System */}
            <div style={{ display: "flex", alignItems: "center", gap: 1,
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: 8, padding: 3 }}>
              {[
                { id: "light",  title: "Light theme",
                  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
                { id: "dark",   title: "Dark theme",
                  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
                { id: "system", title: "System default",
                  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
              ].map(({ id, title, icon }) => (
                <button key={id} onClick={() => setThemePref(id)} title={title}
                  aria-label={title} aria-pressed={themePref === id}
                  style={{ padding: "4px 8px", borderRadius: 5, border: "none", cursor: "pointer",
                    background: themePref === id ? (isDark ? "var(--border-sub)" : "#d1dce8") : "transparent",
                    color: themePref === id ? "var(--text-hi)" : "var(--text-4)",
                    transition: "all .15s" }}>
                  {icon}
                </button>
              ))}
            </div>

            {/* View tabs � only show when sprint is loaded */}
            {sprintLoaded && totalTickets > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 2,
                background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
                {[
                  { id: "tracker",   label: "Tracker",   icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
                  { id: "dashboard", label: "Dashboard", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
                ].map(({ id, label, icon }) => (
                  <button key={id} onClick={() => setActiveView(id)}
                    style={{ display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
                      background: activeView === id ? "var(--bg-elevated)" : "transparent",
                      color: activeView === id ? "var(--text-hi)" : "var(--text-4)",
                      boxShadow: activeView === id ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
                      transition: "all .15s" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={icon}/>
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px" }}>

        {!configured && <SetupBanner />}

        {/* Summary stat cards � always visible when sprint loaded */}
        {sprintLoaded && totalTickets > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 32 }}>
            {[
              { label: "Total Tickets",  value: totalTickets,                  color: "var(--text)" },
              { label: "Completed",      value: `${doneCount}/${totalTickets}`, color: "#22c55e" },
              { label: "Story Points",   value: `${doneSP}/${totalSP} sp`,      color: "#3b82f6" },
              { label: "Sprint",         value: currentSprintName,              color: "#818cf8" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase",
                  letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color,
                  fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Dashboard view */}
        {activeView === "dashboard" && (
          <DashboardView
            sprintTickets={sprintTickets}
            sprintLoaded={sprintLoaded}
            sprintLoading={sprintLoading}
            currentSprintName={currentSprintName}
            sprint={boardSprints.find(s => String(s.id) === String(selectedSprintId)) ?? null}
            onSelectTicket={(id) => {
              setActiveView("tracker");
              setQuery(id);
              setPendingLookup(id);
            }}
          />
        )}

        {/* Tracker view */}
        {activeView === "tracker" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 28, alignItems: "start" }}>

          {/* Left */}
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-hi)", margin: "0 0 4px", letterSpacing: "-0.4px" }}>
                Ticket Lookup
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-4)", margin: "0 0 16px" }}>
                Enter a Jira ticket ID to load its full details, AI review rating & linked PRs from Bitbucket.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10,
                  background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 16px" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-5)" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    id="ticket-lookup"
                    aria-label="Jira ticket ID"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookup()}
                    placeholder="TR-38275"
                    disabled={!configured}
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none",
                      color: "var(--text-hi)", fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
                      padding: "14px 0", letterSpacing: "0.03em",
                      cursor: configured ? "text" : "not-allowed" }}
                  />
                  {query && (
                    <button onClick={clearAll} aria-label="Clear"
                      style={{ background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-5)", fontSize: 16, lineHeight: 1, padding: 2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
                <button onClick={() => lookup()} disabled={loading || !configured}
                  style={{ padding: "0 26px", background: loading ? "var(--border-sub)" : "#3b82f6",
                    border: "none", borderRadius: 12, color: loading ? "var(--text-4)" : "#fff",
                    fontSize: 14, fontWeight: 600,
                    cursor: (loading || !configured) ? "not-allowed" : "pointer",
                    transition: "background .15s", whiteSpace: "nowrap", fontFamily: "Inter,sans-serif" }}
                  onMouseEnter={e => { if (!loading && configured) e.currentTarget.style.background = "#2563eb"; }}
                  onMouseLeave={e => { if (!loading && configured) e.currentTarget.style.background = "#3b82f6"; }}>
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" style={{ animation: "spin 0.7s linear infinite" }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Loading
                    </span>
                  ) : "Fetch →"}
                </button>
              </div>

              {error && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#ef4444",
                  display: "flex", alignItems: "center", gap: 7,
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 8, padding: "10px 14px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
                <div style={{ height: 3, background: "var(--border-sub)" }} />
                <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <Skeleton w={80} h={20} /><Skeleton w={80} h={20} />
                  </div>
                  <Skeleton h={26} /><div style={{ marginTop: 10 }} /><Skeleton w="70%" h={18} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "var(--bg-nav)" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ padding: "16px 20px", borderRight: i<2?"1px solid var(--border)":"none" }}>
                      <Skeleton w={60} h={10} /><div style={{ marginTop: 12 }} /><Skeleton h={32} />
                    </div>
                  ))}
                </div>
                <div style={{ padding: "18px 24px" }}><Skeleton h={8} /></div>
              </div>
            ) : ticket ? (
              <TicketCard ticket={ticket} prs={prs} prsLoading={prsLoading}
                comments={comments} commentsLoading={commentsLoading} />
            ) : <EmptyState />}
          </div>

          {/* Right: Sprint Panel */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 16,
            position: "sticky", top: 68, maxHeight: "calc(100vh - 92px)",
            display: "flex", flexDirection: "column" }}>

            {/* Panel header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)",
              background: "var(--bg-surface)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: "var(--text-4)", textTransform: "uppercase",
                  letterSpacing: "0.1em", fontWeight: 600 }}>
                  {sprintLoading ? "Loading sprint\u2026" :
                    sprintLoaded ? `Sprint Tickets  ${filteredTickets.length}${hasActiveFilters ? ` / ${totalTickets}` : ""}` : "Sprint Tickets"}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  {/* Refresh boards */}
                  <button
                    onClick={() => {
                      setBoardsLoading(true);
                      setBoards([]);
                      fetchAllBoards()
                        .then(setBoards)
                        .finally(() => setBoardsLoading(false));
                    }}
                    disabled={boardsLoading}
                    title="Refresh board list"
                    style={{ background: "transparent", border: "1px solid var(--border-sub)",
                      borderRadius: 6, padding: "4px 7px", cursor: boardsLoading ? "wait" : "pointer",
                      color: "var(--text-4)", fontSize: 11, lineHeight: 1,
                      transition: "border-color .15s, color .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="#3b82f6"; e.currentTarget.style.color="#3b82f6"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-sub)"; e.currentTarget.style.color="var(--text-4)"; }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ display: "block", animation: boardsLoading ? "spin 0.8s linear infinite" : "none" }}>
                      <path d="M3 12a9 9 0 019-9 9 9 0 016.36 2.64L21 9M21 3v6h-6"/>
                      <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.36-2.64L3 15M3 21v-6h6"/>
                    </svg>
                  </button>
                  {/* Saved Reports toggle */}
                  <button onClick={() => setShowSaved((v) => !v)}
                    title="Saved Reports"
                    style={{ background: showSaved ? "rgba(129,140,248,0.15)" : "transparent",
                      border: "1px solid " + (showSaved ? "#818cf8" : "var(--border-sub)"),
                      borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                      color: showSaved ? "#818cf8" : "var(--text-4)", fontSize: 11, fontWeight: 600 }}>
                    {savedReports.length > 0 ? `☰ ${savedReports.length}` : "☰"}
                  </button>
                  {/* Save button */}
                  {sprintLoaded && sprintTickets.length > 0 && (
                    <button onClick={saveCurrentSprint}
                      title="Save current sprint report"
                      style={{ background: "transparent", border: "1px solid var(--border-sub)",
                        borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                        color: "var(--text-4)", fontSize: 11, fontWeight: 600,
                        transition: "border-color .15s, color .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor="#22c55e"; e.currentTarget.style.color="#22c55e"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-sub)"; e.currentTarget.style.color="var(--text-4)"; }}>
                      ↓ Save
                    </button>
                  )}
                  {/* Export button */}
                  {sprintLoaded && filteredTickets.length > 0 && (
                    <button onClick={exportCurrentSprint}
                      title="Export to Excel"
                      style={{ background: "transparent", border: "1px solid var(--border-sub)",
                        borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                        color: "var(--text-4)", fontSize: 11, fontWeight: 600,
                        transition: "border-color .15s, color .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor="#22c55e"; e.currentTarget.style.color="#22c55e"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-sub)"; e.currentTarget.style.color="var(--text-4)"; }}>
                      ↓ Excel
                    </button>
                  )}
                </div>
              </div>

              {/* Board selector */}
              <div style={{ marginBottom: 6 }}>
                <Combobox
                  options={boards.map((b) => ({
                    value: String(b.id),
                    label: b.name
                      + (b.projectKey ? ` (${b.projectKey})` : "")
                      + (b.type ? ` · ${b.type}` : ""),
                  }))}
                  value={selectedBoardId}
                  onChange={setSelectedBoardId}
                  placeholder={boardsLoading ? "Loading boards\u2026" : boards.length > 0 ? "Search or select a board\u2026" : "No boards found"}
                  loading={boardsLoading}
                  accentColor="#3b82f6"
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  }
                />
              </div>

              {/* Sprint selector � scrum boards only */}
              {selectedBoardId && selectedBoardType !== "kanban" && (
                <div style={{ marginBottom: 8 }}>
                  <Combobox
                    options={boardSprints.map((s) => ({
                      value: String(s.id),
                      label: s.name,
                      badge: s.state,
                    }))}
                    value={selectedSprintId}
                    onChange={setSelectedSprintId}
                    placeholder={sprintsLoading ? "Loading sprints\u2026" : "Search or select a sprint\u2026"}
                    loading={sprintsLoading}
                    accentColor="#818cf8"
                    icon={
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2">
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/>
                      </svg>
                    }
                  />
                </div>
              )}
              {/* Kanban notice � no sprint needed, tickets load automatically */}
              {selectedBoardId && selectedBoardType === "kanban" && (
                <div style={{ marginBottom: 8, padding: "6px 10px", borderRadius: 7,
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                  fontSize: 11, color: "#818cf8", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="10" rx="1"/>
                  </svg>
                  Kanban board — showing all board tickets
                </div>
              )}

              {/* Filter row */}
              {sprintLoaded && sprintTickets.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: "var(--text-5)", textTransform: "uppercase",
                      letterSpacing: "0.1em", fontWeight: 700 }}>Filters</span>
                    {hasActiveFilters && (
                      <button onClick={() => { setFilterAssignee(""); setFilterStatus(""); setFilterStart(""); setFilterEnd(""); }}
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                          borderRadius: 5, padding: "2px 7px", cursor: "pointer",
                          color: "#ef4444", fontSize: 10, fontWeight: 600 }}>
                        × Clear all
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 80, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Assignee</span>
                      <select id="filter-assignee" name="filter-assignee" aria-label="Filter by assignee" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}
                        style={{ width: "100%", background: "var(--bg)", border: "1px solid " + (filterAssignee ? "#3b82f6" : "var(--border)"),
                          borderRadius: 6, padding: "5px 8px", color: filterAssignee ? "#60a5fa" : "var(--text-4)",
                          fontSize: 11, outline: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                        <option value="">All Assignees</option>
                        {uniqueAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 80, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Status</span>
                      <select id="filter-status" name="filter-status" aria-label="Filter by status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ width: "100%", background: "var(--bg)", border: "1px solid " + (filterStatus ? "#3b82f6" : "var(--border)"),
                          borderRadius: 6, padding: "5px 8px", color: filterStatus ? "#60a5fa" : "var(--text-4)",
                          fontSize: 11, outline: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                        <option value="">All Statuses</option>
                        {uniqueStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Date range filter */}
              {sprintLoaded && sprintTickets.length > 0 && (() => {
                const dateRangeInvalid = filterStart && filterEnd && filterEnd < filterStart;
                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Created From</span>
                        <input type="date" value={filterStart}
                          id="filter-created-from"
                          name="filter-created-from"
                          onChange={(e) => setFilterStart(e.target.value)}
                          max={filterEnd || undefined}
                          aria-label="Filter: tickets created from this date"
                          style={{ width: "100%", background: "var(--bg)",
                            border: "1px solid " + (dateRangeInvalid ? "#ef4444" : filterStart ? "#3b82f6" : "var(--border)"),
                            borderRadius: 6, padding: "5px 8px",
                            color: dateRangeInvalid ? "#ef4444" : filterStart ? "#60a5fa" : "var(--text-3)",
                            fontSize: 11, outline: "none",
                            fontFamily: "Inter, sans-serif",
                            colorScheme: isDark ? "dark" : "light", cursor: "pointer" }} />
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 9, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Created To</span>
                        <input type="date" value={filterEnd}
                          id="filter-created-to"
                          name="filter-created-to"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (filterStart && val && val < filterStart) {
                              setFilterEnd(filterStart); // snap back to earliest valid
                            } else {
                              setFilterEnd(val);
                            }
                          }}
                          min={filterStart || undefined}
                          aria-label="Filter: tickets created up to this date"
                          style={{ width: "100%", background: "var(--bg)",
                            border: "1px solid " + (dateRangeInvalid ? "#ef4444" : filterEnd ? "#3b82f6" : "var(--border)"),
                            borderRadius: 6, padding: "5px 8px",
                            color: dateRangeInvalid ? "#ef4444" : filterEnd ? "#60a5fa" : "var(--text-3)",
                            fontSize: 11, outline: "none",
                            fontFamily: "Inter, sans-serif",
                            colorScheme: isDark ? "dark" : "light", cursor: "pointer" }} />
                      </div>
                    </div>
                    {dateRangeInvalid && (
                      <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 5,
                        fontSize: 10, color: "#ef4444",
                        background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: 5, padding: "4px 8px" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        "Created To" must be on or after "Created From"
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Saved reports panel */}
            {showSaved && (
              <div style={{ background: "var(--bg-nav)", borderBottom: "1px solid var(--border)",
                padding: "10px 14px", maxHeight: 220, overflowY: "auto", flexShrink: 0 }}>
                {savedReports.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>No saved reports yet. Click &#x2193; Save to store a sprint snapshot.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {savedReports.map((r) => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8,
                        background: "var(--bg-surface)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
                            {r.tickets?.length ?? 0} tickets \u00b7 {new Date(r.savedAt).toLocaleDateString("en-GB")}
                          </div>
                        </div>
                        <button onClick={() => exportToExcel(r.tickets, r.name)}
                          title="Export to Excel"
                          style={{ background: "transparent", border: "1px solid var(--border-sub)",
                            borderRadius: 5, padding: "3px 7px", cursor: "pointer",
                            color: "#22c55e", fontSize: 10, fontWeight: 600 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                        <button onClick={() => loadSavedReport(r)}
                          title="Load into sprint panel"
                          style={{ background: "transparent", border: "1px solid var(--border-sub)",
                            borderRadius: 5, padding: "3px 7px", cursor: "pointer",
                            color: "#3b82f6", fontSize: 10, fontWeight: 600 }}>
                          Load
                        </button>
                        <button onClick={() => removeSavedReport(r.id)}
                          title="Delete report"
                          style={{ background: "transparent", border: "1px solid var(--border-sub)",
                            borderRadius: 5, padding: "3px 7px", cursor: "pointer",
                            color: "#ef4444", fontSize: 10, fontWeight: 600 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sprint fetch error */}
            {sprintError && (
              <div style={{ margin: "8px 14px", fontSize: 12, color: "#ef4444",
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 8, padding: "9px 12px",
                display: "flex", alignItems: "flex-start", gap: 7 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{sprintError}</span>
              </div>
            )}
            {/* Ticket rows */}
            <div style={{ overflowY: "auto", flex: 1, borderRadius: "0 0 16px 16px" }}>
              {sprintLoading ? (
                <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={38} radius={8} />)}
                </div>
              ) : sprintLoaded && sprintTickets.length === 0 ? (
                <div style={{ padding: "32px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>No sprint tickets found.</p>
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                    Set VITE_JIRA_PROJECT_KEY, VITE_JIRA_SPRINT_ID, or VITE_JIRA_BOARD_ID in .env
                  </p>
                </div>
              ) : !sprintLoaded && !configured ? (
                <div style={{ padding: "32px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>Configure Jira to browse sprint tickets.</p>
                </div>
              ) : sprintLoaded && filteredTickets.length === 0 ? (
                <div style={{ padding: "32px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>No tickets match the current filters.</p>
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <TicketRow key={t.id} ticket={t} isActive={ticket?.id === t.id}
                    onSelect={(id) => { setQuery(id); lookup(id); }} />
                ))
              )}
            </div>
          </div>
        </div>
        )} {/* end tracker view */}
      </main>
    </div>
  );
}
