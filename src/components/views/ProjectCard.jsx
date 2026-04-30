import { useState, useCallback } from "react";
import { countWorkingDays, secondsToMandays } from "../../utils/workingDaysUtils.js";
import { useLabelMilestoneActions } from "../../hooks/useLabelMilestoneActions.js";
import { mapIssue } from "../../services/jira/mapIssue.js";

// ─── Tiny stat box ────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, accent }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 80 }}>
      <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: accent ?? "var(--text-hi)", lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{sub}</span>}
    </div>
  );
}

// ─── Slim progress bar ────────────────────────────────────────────────────────
function ProgressBar({ pct, color = "#3b82f6" }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: "var(--border-sub)", overflow: "hidden", flex: 1, minWidth: 60 }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
    </div>
  );
}

// ─── Risk pill ────────────────────────────────────────────────────────────────
function RiskPill({ count, label, color }) {
  if (!count) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
      padding: "2px 8px", borderRadius: 10, background: `${color}22`, color, border: `1px solid ${color}55` }}>
      {count} {label}
    </span>
  );
}

// ─── Number input ─────────────────────────────────────────────────────────────
function NumInput({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        style={{ width: 64, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border-sub)",
          background: "var(--bg)", color: "var(--text-hi)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
      />
    </div>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({ onClick, disabled, status, icon, label, color = "#3b82f6" }) {
  const isLoading = status === "loading";
  const isSuccess = status === "success";
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7,
        border: `1px solid ${isSuccess ? "#22c55e" : color}55`,
        background: isSuccess ? "#14532d44" : `${color}18`,
        color: isSuccess ? "#22c55e" : color,
        fontSize: 12, fontWeight: 600, cursor: disabled || isLoading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "all .15s" }}>
      {isLoading ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
        </svg>
      ) : isSuccess ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : icon}
      {isSuccess ? "Done!" : label}
    </button>
  );
}

// ─── Main ProjectCard ─────────────────────────────────────────────────────────
export default function ProjectCard({ epic, statsEntry, override, onExpand, onOverrideChange }) {
  const [expanded, setExpanded] = useState(false);
  const { publishMilestoneFromLabels, exportMilestoneFromLabels, publishStatus, exportStatus } = useLabelMilestoneActions();

  const handleToggle = useCallback(() => {
    if (!expanded) onExpand(epic.id, epic.key);
    setExpanded(v => !v);
  }, [expanded, epic, onExpand]);

  const status = statsEntry?.status ?? "idle";
  const data   = statsEntry?.data ?? null;

  // Auto-fetched leave/holiday values from Tempo worklogs
  const autoLeave    = data?.leaveData?.leaveDays    ?? 0;
  const autoHolidays = data?.leaveData?.publicHolidays ?? 0;
  const autoPerPerson = data?.leaveData?.perPerson ?? {};
  const memberLeaveOverrides = override?.memberLeave ?? {};

  // Use auto-fetched values unless user has explicitly overridden (override !== null)
  const publicHolidays = override?.publicHolidays !== null && override?.publicHolidays !== undefined ? override.publicHolidays : autoHolidays;
  const decisions = override?.decisions ?? "";

  // Per-person leave: override per member if set, else use auto-fetched per-person
  const getMemberLeave = (name) => {
    if (memberLeaveOverrides[name] !== undefined && memberLeaveOverrides[name] !== null) return memberLeaveOverrides[name];
    if (autoPerPerson[name] !== undefined) return autoPerPerson[name];
    return autoLeave; // fallback to team average
  };

  // Total leave = sum of per-person leaves (or fallback to override.leaveDays)
  const computedTotalLeave = data?.teamMembers?.length > 0
    ? Math.round(data.teamMembers.reduce((sum, m) => sum + getMemberLeave(m.name), 0) * 10) / 10
    : 0;
  const leaveDays = override?.leaveDays !== null && override?.leaveDays !== undefined
    ? override.leaveDays
    : computedTotalLeave;

  const mandays       = data ? secondsToMandays(data.totalTimeSeconds) : null;
  const completionPct = data?.totalCount > 0 ? Math.round((data.doneCount / data.totalCount) * 100) : 0;
  const workingDays   = data ? countWorkingDays(data.startDate, data.endDate, publicHolidays, leaveDays) : null;
  const teamSize      = data?.teamMembers?.length ?? null;

  const riskColor = completionPct >= 80 ? "#22c55e" : completionPct >= 50 ? "#f59e0b" : "#ef4444";

  const handlePublish = useCallback(async () => {
    if (!data?.rawIssues) return;
    const mapped = data.rawIssues.map(mapIssue);
    await publishMilestoneFromLabels(mapped, [epic.name], epic.name);
  }, [data, epic, publishMilestoneFromLabels]);

  const handleExport = useCallback(() => {
    if (!data?.rawIssues) return;
    const mapped = data.rawIssues.map(mapIssue);
    exportMilestoneFromLabels(mapped, [epic.name], epic.name);
  }, [data, epic, exportMilestoneFromLabels]);

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border-sub)", background: "var(--bg-elevated)",
      overflow: "hidden", transition: "box-shadow .2s" }}>

      {/* ── Header row ── */}
      <button
        onClick={handleToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
          background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>

        {/* Epic key badge */}
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
          background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44",
          fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {epic.key}
        </span>

        {/* Epic name */}
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text-hi)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {epic.name}
        </span>

        {/* Completion bar (only when loaded) */}
        {data && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <ProgressBar pct={completionPct} color={riskColor} />
            <span style={{ fontSize: 12, fontWeight: 700, color: riskColor, minWidth: 34 }}>{completionPct}%</span>
          </div>
        )}

        {/* Date range */}
        {data?.startDate && (
          <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>
            {data.startDate} → {data.endDate ?? "ongoing"}
          </span>
        )}

        {/* Risk pills */}
        {data && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <RiskPill count={data.blockedCount} label="blocked" color="#ef4444" />
            <RiskPill count={data.highPriorityNotDoneCount} label="high-prio" color="#f59e0b" />
          </div>
        )}

        {/* Chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-sub)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Loading state */}
          {status === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
              Fetching child issues…
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div style={{ color: "#ef4444", fontSize: 13 }}>
              Failed to load: {statsEntry?.error}
            </div>
          )}

          {/* Stats row */}
          {data && (
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
              <StatBox label="Total Tickets" value={data.totalCount} />
              <StatBox label="Done" value={data.doneCount} sub={`${completionPct}%`} accent={riskColor} />
              <StatBox label="In Progress" value={data.inProgressCount} />
              <StatBox label="Blocked" value={data.blockedCount} accent={data.blockedCount > 0 ? "#ef4444" : undefined} />
              <StatBox label="Mandays" value={mandays ?? 0} sub="logged (8h)" />
              <StatBox label="Team Size" value={teamSize ?? 0} sub="members" />
              <StatBox label="Total SP" value={data.totalSP} sub={`${data.doneSP} done`} />
              {workingDays !== null && (
                <StatBox label="Working Days" value={workingDays}
                  sub={`−${publicHolidays}ph −${leaveDays}lv`} accent="#818cf8" />
              )}
            </div>
          )}

          {/* Team breakdown */}
          {data?.teamMembers?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 8 }}>Team</div>
              {/* Column headers */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, paddingLeft: 34 }}>
                <span style={{ flex: 1, fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Name</span>
                <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.4px", minWidth: 80, textAlign: "right" }}>Tickets</span>
                <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.4px", minWidth: 72, textAlign: "right" }}>Mandays</span>
                <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.4px", minWidth: 56, textAlign: "center" }}>Leave</span>
                <div style={{ width: 80 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.teamMembers.map(m => {
                  const mLeave = getMemberLeave(m.name);
                  const isAutoLeave = memberLeaveOverrides[m.name] === undefined || memberLeaveOverrides[m.name] === null;
                  return (
                  <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt={m.name} width={24} height={24}
                          style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#6366f1",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                    }
                    <span style={{ fontSize: 13, color: "var(--text-hi)", flex: 1 }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)", minWidth: 80, textAlign: "right" }}>{m.done}/{m.total} tickets</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)", minWidth: 72, textAlign: "right" }}>
                      {secondsToMandays(m.timeSeconds)} md
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 56, justifyContent: "center" }}>
                      <input
                        type="number" min={0} step={0.5}
                        value={mLeave}
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          onOverrideChange(epic.key, "memberLeave", { ...memberLeaveOverrides, [m.name]: val });
                        }}
                        title={isAutoLeave ? `Auto (avg ${autoLeave} days)` : "Manually set"}
                        style={{ width: 44, padding: "2px 4px", borderRadius: 4,
                          border: `1px solid ${isAutoLeave ? "var(--border-sub)" : "#f59e0b55"}`,
                          background: isAutoLeave ? "var(--bg)" : "#f59e0b11",
                          color: "var(--text-hi)", fontSize: 11, fontFamily: "inherit",
                          textAlign: "center", outline: "none" }}
                      />
                      {isAutoLeave && mLeave > 0 && (
                        <span style={{ fontSize: 8, color: "#38bdf8", fontWeight: 600 }} title="Auto-computed average">A</span>
                      )}
                    </div>
                    <div style={{ width: 80 }}>
                      <ProgressBar pct={m.total > 0 ? (m.done / m.total) * 100 : 0} color="#6366f1" />
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Issues / Risks */}
          {data && (data.blockedTickets.length > 0 || data.highPriorityNotDone.length > 0) && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 8 }}>Issues / Risks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {data.blockedTickets.map(t => (
                  <div key={t.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                    <span style={{ padding: "1px 6px", borderRadius: 4, background: "#ef444422",
                      color: "#ef4444", fontFamily: "monospace", flexShrink: 0 }}>BLOCKED</span>
                    <span style={{ color: "var(--text-3)", fontFamily: "monospace", flexShrink: 0 }}>{t.key}</span>
                    <span style={{ color: "var(--text-2)" }}>{t.summary}</span>
                    <span style={{ color: "var(--text-3)", marginLeft: "auto", flexShrink: 0 }}>{t.assignee}</span>
                  </div>
                ))}
                {data.highPriorityNotDone.map(t => (
                  <div key={t.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                    <span style={{ padding: "1px 6px", borderRadius: 4, background: "#f59e0b22",
                      color: "#f59e0b", fontFamily: "monospace", flexShrink: 0 }}>{t.priority.toUpperCase()}</span>
                    <span style={{ color: "var(--text-3)", fontFamily: "monospace", flexShrink: 0 }}>{t.key}</span>
                    <span style={{ color: "var(--text-2)" }}>{t.summary}</span>
                    <span style={{ color: "var(--text-3)", marginLeft: "auto", flexShrink: 0 }}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time deductions — leave computed from per-person sums, holidays from INT-24 */}
          {data && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 10 }}>Time Deductions</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                      Total Leave Days
                    </label>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                      background: "#0ea5e922", color: "#38bdf8", border: "1px solid #0ea5e955" }}
                      title={`Sum of per-person leave from team rows (${data.teamMembers?.length ?? 0} members)`}>
                      Σ per-person
                    </span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-hi)", padding: "4px 0" }}>
                    {leaveDays}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                      Public Holidays (INT-24)
                    </label>
                    {autoHolidays > 0 && override?.publicHolidays === null && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
                        background: "#0ea5e922", color: "#38bdf8", border: "1px solid #0ea5e955" }}
                        title={`Auto: ${autoHolidays} unique holiday dates from INT-24 worklogs`}>auto</span>
                    )}
                  </div>
                  <input type="number" min={0} value={publicHolidays}
                    onChange={e => onOverrideChange(epic.key, "publicHolidays", Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{ width: 64, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border-sub)",
                      background: "var(--bg)", color: "var(--text-hi)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                </div>
                {workingDays !== null && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Net Working Days
                    </span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: "#818cf8", lineHeight: 1 }}>{workingDays}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                      {data.startDate} → {data.endDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Decisions textarea */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-3)",
              textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
              Decisions
            </label>
            <textarea
              rows={3}
              placeholder="Record project decisions, sign-offs, scope changes…"
              value={decisions}
              onChange={e => onOverrideChange(epic.key, "decisions", e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8,
                border: "1px solid var(--border-sub)", background: "var(--bg)",
                color: "var(--text-hi)", fontSize: 13, fontFamily: "inherit",
                resize: "vertical", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Action buttons */}
          {data && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ActionBtn
                onClick={handleExport}
                status={exportStatus}
                color="#22c55e"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>}
                label="Export Excel"
              />
              <ActionBtn
                onClick={handlePublish}
                status={publishStatus}
                color="#8b5cf6"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>}
                label="Publish Confluence"
              />
            </div>
          )}

        </div>
      )}
    </div>
  );
}
