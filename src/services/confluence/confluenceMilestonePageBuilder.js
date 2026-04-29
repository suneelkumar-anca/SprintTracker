import { fmtFull } from "../../utils/dateUtils.js";
import { fetchPullRequests } from "../jira/fetchPullRequests.js";
import { generateAIMilestoneSummary } from "../ai/githubCopilotClient.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(dateStr) {
  const s = fmtFull(dateStr);
  return s === "\u2014" ? "\u2013" : s;
}

function ragColor(pct) {
  if (pct >= 80) return { bg: "#e3fcef", border: "#006644", text: "#006644", label: "On Track" };
  if (pct >= 50) return { bg: "#fffae5", border: "#c67c00", text: "#c67c00", label: "At Risk" };
  return { bg: "#ffebe6", border: "#c5203e", text: "#c5203e", label: "Off Track" };
}

function ragBadge(pct) {
  const r = ragColor(pct);
  const colorMap = { "On Track": "Green", "At Risk": "Yellow", "Off Track": "Red" };
  return `<ac:structured-macro ac:name="status"><ac:parameter ac:name="subtle">false</ac:parameter><ac:parameter ac:name="title">${r.label}</ac:parameter><ac:parameter ac:name="color">${colorMap[r.label] ?? "Yellow"}</ac:parameter></ac:structured-macro>`;
}

function riskLevelBadge(level) {
  const colorMap = { Green: "Green", Amber: "Yellow", Red: "Red" };
  return `<ac:structured-macro ac:name="status"><ac:parameter ac:name="subtle">false</ac:parameter><ac:parameter ac:name="title">${level}</ac:parameter><ac:parameter ac:name="color">${colorMap[level] ?? "Yellow"}</ac:parameter></ac:structured-macro>`;
}

/** Wrap content in a Confluence panel macro */
function panel(title, borderColor, titleBGColor, bgColor, body) {
  return `<ac:structured-macro ac:name="panel">` +
    `<ac:parameter ac:name="title">${escapeHtml(title)}</ac:parameter>` +
    `<ac:parameter ac:name="borderColor">${borderColor}</ac:parameter>` +
    `<ac:parameter ac:name="titleBGColor">${titleBGColor}</ac:parameter>` +
    `<ac:parameter ac:name="bgColor">${bgColor}</ac:parameter>` +
    `<ac:rich-text-body>${body}</ac:rich-text-body>` +
    `</ac:structured-macro>`;
}

/** Confluence built-in callout macros: tip (green), note (yellow), info (blue), warning (red) */
function callout(type, title, body) {
  return `<ac:structured-macro ac:name="${type}">` +
    (title ? `<ac:parameter ac:name="title">${escapeHtml(title)}</ac:parameter>` : "") +
    `<ac:rich-text-body>${body}</ac:rich-text-body>` +
    `</ac:structured-macro>`;
}

function getStatusMacro(status) {
  const statusMap = {
    "Done":        { color: "Green",  title: "Done" },
    "Closed":      { color: "Green",  title: "Closed" },
    "In Progress": { color: "Blue",   title: "In Progress" },
    "In Review":   { color: "Blue",   title: "In Review" },
    "Feedback":    { color: "Yellow", title: "Feedback" },
    "Testing":     { color: "Yellow", title: "Testing" },
    "UAT":         { color: "Yellow", title: "UAT" },
    "To Do":       { color: "Grey",   title: "To Do" },
    "Open":        { color: "Grey",   title: "Open" },
    "Backlog":     { color: "Grey",   title: "Backlog" },
    "Rejected":    { color: "Red",    title: "Rejected" },
    "Declined":    { color: "Red",    title: "Declined" },
    "Blocked":     { color: "Red",    title: "Blocked" },
  };
  const cfg = statusMap[status] ?? { color: "Grey", title: status || "Unknown" };
  return `<ac:structured-macro ac:name="status"><ac:parameter ac:name="subtle">false</ac:parameter><ac:parameter ac:name="title">${escapeHtml(cfg.title)}</ac:parameter><ac:parameter ac:name="color">${cfg.color}</ac:parameter></ac:structured-macro>`;
}

function getPriorityMacro(priority) {
  const map = {
    "Highest": { color: "Red",    title: "Highest" },
    "High":    { color: "Yellow", title: "High" },
    "Medium":  { color: "Yellow", title: "Medium" },
    "Low":     { color: "Green",  title: "Low" },
    "Lowest":  { color: "Blue",   title: "Lowest" },
  };
  const cfg = map[priority] ?? { color: "Grey", title: priority || "Unset" };
  return `<ac:structured-macro ac:name="status"><ac:parameter ac:name="subtle">true</ac:parameter><ac:parameter ac:name="title">${escapeHtml(cfg.title)}</ac:parameter><ac:parameter ac:name="color">${cfg.color}</ac:parameter></ac:structured-macro>`;
}

function getTypeMacro(type) {
  const map = {
    "Story":    { color: "Blue",   title: "Story" },
    "Task":     { color: "Blue",   title: "Task" },
    "Bug":      { color: "Red",    title: "Bug" },
    "Epic":     { color: "Purple", title: "Epic" },
    "Sub-task": { color: "Green",  title: "Sub-task" },
    "Subtask":  { color: "Green",  title: "Subtask" },
  };
  const cfg = map[type] ?? { color: "Grey", title: type || "Unset" };
  return `<ac:structured-macro ac:name="status"><ac:parameter ac:name="subtle">true</ac:parameter><ac:parameter ac:name="title">${escapeHtml(cfg.title)}</ac:parameter><ac:parameter ac:name="color">${cfg.color}</ac:parameter></ac:structured-macro>`;
}

function buildInlinePRSummary(prs) {
  if (!prs || prs.length === 0) return "";
  let html = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e0e0;">`;
  html += `<strong style="color:#0052cc;font-size:11px;">PRs (${prs.length}):</strong>`;
  prs.forEach((pr) => {
    const sc = pr.status === "MERGED" ? "#28a745" : pr.status === "OPEN" ? "#0052cc" : "#6a737d";
    html += `<div style="margin:4px 0;font-size:11px;">`;
    html += pr.url
      ? `<a href="${escapeHtml(pr.url)}" style="color:${sc};text-decoration:none;">${escapeHtml(pr.name)}</a>`
      : `<span style="color:${sc};">${escapeHtml(pr.name)}</span>`;
    html += ` <span style="color:#999;font-size:10px;">[${pr.status || "?"}]</span></div>`;
  });
  html += `</div>`;
  return html;
}

function groupByAssignee(tickets) {
  const groups = {};
  tickets.forEach((t) => {
    const a = t.assigneeName || "Unassigned";
    if (!groups[a]) groups[a] = [];
    groups[a].push(t);
  });
  return groups;
}

async function buildPersonTable(personTickets, personName) {
  const total   = personTickets.length;
  const done    = personTickets.filter(t => { const s = (t.status ?? "").toLowerCase(); return s === "done" || s === "closed"; }).length;
  const totalSP = personTickets.reduce((sum, t) => sum + (t.sp || 0), 0);
  const doneSP  = personTickets
    .filter(t => { const s = (t.status ?? "").toLowerCase(); return s === "done" || s === "closed"; })
    .reduce((sum, t) => sum + (t.sp || 0), 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  let html = `<table style="width:100%;border-collapse:collapse;margin:6px 0;"><tbody><tr>
    <td style="padding:4px 8px;"><strong>Assigned:</strong> ${total}</td>
    <td style="padding:4px 8px;"><strong>Done:</strong> ${done}/${total} (${pct}%)</td>
    <td style="padding:4px 8px;"><strong>Story Points:</strong> ${doneSP}/${totalSP}</td>
  </tr></tbody></table>`;

  html += `<table style="width:100%;border-collapse:collapse;" border="1">
    <colgroup>
      <col style="width:8%;"/><col style="width:52%;"/><col style="width:7%;"/>
      <col style="width:15%;"/><col style="width:18%;"/>
    </colgroup>
    <tbody><tr>
      <th style="padding:6px 8px;background:#f5f5f5;"><strong>Ticket</strong></th>
      <th style="padding:6px 8px;background:#f5f5f5;"><strong>Summary</strong></th>
      <th style="padding:6px 8px;background:#f5f5f5;text-align:center;"><strong>SP</strong></th>
      <th style="padding:6px 8px;background:#f5f5f5;"><strong>Status</strong></th>
      <th style="padding:6px 8px;background:#f5f5f5;"><strong>Priority / Type</strong></th>
    </tr>`;

  for (const t of personTickets) {
    const ticketLink = t.jiraUrl
      ? `<a href="${escapeHtml(t.jiraUrl)}">${escapeHtml(t.id)}</a>`
      : escapeHtml(t.id || "");

    let summaryHtml = escapeHtml(t.description || "");
    try {
      if (t.numericId) {
        const prs = await fetchPullRequests(t.numericId);
        if (prs && prs.length > 0) summaryHtml += buildInlinePRSummary(prs);
      }
    } catch (_) { /* continue without PR data */ }

    html += `<tr>
      <td style="padding:6px 8px;word-wrap:break-word;">${ticketLink}</td>
      <td style="padding:6px 8px;word-wrap:break-word;">${summaryHtml}</td>
      <td style="padding:6px 8px;text-align:center;">${(t.sp != null && t.sp !== "") ? escapeHtml(String(t.sp)) : "&ndash;"}</td>
      <td style="padding:6px 8px;">${getStatusMacro(t.status || "")}</td>
      <td style="padding:6px 8px;">${getPriorityMacro(t.priority || "")}${t.issueType ? `<div style="margin-top:4px;">${getTypeMacro(t.issueType)}</div>` : ""}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function buildMilestonePage(tickets, milestoneName, deadlineDate, reviewDate = null) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // --- Core metrics ---
  const isDone = (t) => { const s = (t.status ?? "").toLowerCase(); return s === "done" || s === "closed"; };
  const totalCount      = tickets.length;
  const doneCount       = tickets.filter(isDone).length;
  const totalSP         = tickets.reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0);
  const doneSP          = tickets.filter(isDone).reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0);
  const completionPct   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const uniqueAssignees = new Set(tickets.map(t => t.assigneeName || "Unassigned")).size;

  // --- Extended metrics ---
  const rejectedCount = tickets.filter(t => { const s = (t.status ?? "").toLowerCase(); return s === "rejected" || s === "declined"; }).length;
  const blockedCount  = tickets.filter(t => { const s = (t.status ?? "").toLowerCase(); return s.includes("blocked") || s.includes("impediment"); }).length;
  const unassigned    = tickets.filter(t => !t.assigneeName || t.assigneeName === "Unassigned").length;
  const noSp          = tickets.filter(t => !t.sp || !Number.isFinite(t.sp) || t.sp === 0).length;
  const ratings       = tickets.map(t => t.reviewRating).filter(r => r != null && Number.isFinite(Number(r)));
  const avgRating     = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + Number(r), 0) / ratings.length) * 10) / 10
    : null;

  // --- Timeline ---
  const earliestStart = tickets.reduce((min, t) => {
    if (!t.created) return min;
    return (!min || t.created < min) ? t.created : min;
  }, null);

  let daysInfo = "";
  let daysInfoPlain = "";
  if (deadlineDate) {
    const diff = Math.round((new Date(deadlineDate) - now) / 86400000);
    daysInfo = diff > 0
      ? `<span style="color:#006644;">${diff} days remaining</span>`
      : `<span style="color:#c5203e;">${Math.abs(diff)} days overdue</span>`;
    daysInfoPlain = diff > 0 ? `${diff} days remaining` : `${Math.abs(diff)} days overdue`;
  }

  // --- AI executive summary (always present — retries 3x, falls back to data-driven metrics) ---
  const aiData = await generateAIMilestoneSummary(tickets, milestoneName).catch((err) => {
    console.error('AI milestone summary uncaught error:', err?.message);
    // Ultimate fallback: derive risk from completion %
    const riskLevelFb = completionPct >= 80 ? 'Green' : completionPct >= 50 ? 'Amber' : 'Red';
    return {
      executiveSummary: `Milestone "${milestoneName}" is ${completionPct}% complete (${doneCount}/${totalCount} tickets, ${doneSP}/${totalSP} SP).`,
      riskLevel: riskLevelFb,
      keyRisks: [],
      recommendations: [],
      teamAnalysis: null,
      qualityAssessment: null,
      scopeAndEstimationHealth: null,
      closingNote: '(AI assessment unavailable)',
    };
  });

  // ==========================================================================
  // Section 1: Header + TOC
  // ==========================================================================
  let html = `<h1>${escapeHtml(milestoneName)}</h1>`;
  html += `<p>Generated: <strong>${timestamp}</strong> &nbsp;&nbsp; Health: ${ragBadge(completionPct)} &nbsp;&nbsp; Completion: <strong>${completionPct}%</strong> (${doneCount}/${totalCount} tickets)</p>`;
  // Table of Contents
  html += `<ac:structured-macro ac:name="toc">` +
    `<ac:parameter ac:name="minLevel">2</ac:parameter>` +
    `<ac:parameter ac:name="maxLevel">3</ac:parameter>` +
    `<ac:parameter ac:name="style">disc</ac:parameter>` +
    `</ac:structured-macro>`;
  html += `<hr/>`;

  // ==========================================================================
  // Section 2: AI Executive Assessment (always rendered)
  // ==========================================================================
  {
    const calloutType = aiData.riskLevel === "Green" ? "tip" : aiData.riskLevel === "Red" ? "warning" : "note";
    const calloutTitle = `AI Executive Assessment — ${aiData.riskLevel === "Green" ? "On Track" : aiData.riskLevel === "Red" ? "Critical" : "At Risk"}`;

    let aiBody = `<p>${escapeHtml(aiData.executiveSummary)}</p>`;
    aiBody += `<p><strong>Risk Level:</strong> ${riskLevelBadge(aiData.riskLevel)}</p>`;

    if (aiData.keyRisks?.length > 0) {
      aiBody += `<h4>🚨 Key Risks</h4><ul>`;
      aiData.keyRisks.forEach(r => { aiBody += `<li>${escapeHtml(r)}</li>`; });
      aiBody += `</ul>`;
    }

    if (aiData.recommendations?.length > 0) {
      aiBody += `<h4>✅ Recommendations</h4><ol>`;
      aiData.recommendations.forEach(r => { aiBody += `<li>${escapeHtml(r)}</li>`; });
      aiBody += `</ol>`;
    }

    if (aiData.teamAnalysis || aiData.qualityAssessment || aiData.scopeAndEstimationHealth) {
      // Two-column layout for the three deep-analysis sections
      aiBody += `<ac:layout><ac:layout-section ac:type="two_equal">`;

      aiBody += `<ac:layout-cell>`;
      if (aiData.teamAnalysis) {
        aiBody += panel("👥 Team Load & Balance", "#0052cc", "#e3eeff", "#f5f8ff",
          `<p>${escapeHtml(aiData.teamAnalysis)}</p>`);
      }
      if (aiData.scopeAndEstimationHealth) {
        aiBody += panel("📐 Scope & Estimation Health", "#c67c00", "#fffae5", "#fffdf0",
          `<p>${escapeHtml(aiData.scopeAndEstimationHealth)}</p>`);
      }
      aiBody += `</ac:layout-cell>`;

      aiBody += `<ac:layout-cell>`;
      if (aiData.qualityAssessment) {
        aiBody += panel("🔍 Quality Assessment", "#006644", "#e3fcef", "#f0faf2",
          `<p>${escapeHtml(aiData.qualityAssessment)}</p>`);
      }
      aiBody += `</ac:layout-cell>`;

      aiBody += `</ac:layout-section></ac:layout>`;
    }

    if (aiData.closingNote) {
      aiBody += `<p><em>${escapeHtml(aiData.closingNote)}</em></p>`;
    }

    html += callout(calloutType, calloutTitle, aiBody);
  }

  // ==========================================================================
  // Section 3: Health Dashboard
  // ==========================================================================
  html += `<h2>📊 Health Dashboard</h2>`;

  // Two-column layout: left = key metrics table, right = quick stats panel
  const spPct = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0;
  const quickStats =
    panel("🎯 Delivery Snapshot", "#0052cc", "#e3eeff", "#f5f8ff",
      `<table><tbody>` +
      `<tr><td><strong>Tickets Done</strong></td><td>${doneCount} / ${totalCount} &nbsp;(${completionPct}%)</td></tr>` +
      `<tr><td><strong>Story Points</strong></td><td>${doneSP} / ${totalSP} &nbsp;(${spPct}%)</td></tr>` +
      `<tr><td><strong>Team Size</strong></td><td>${uniqueAssignees} member${uniqueAssignees !== 1 ? "s" : ""}</td></tr>` +
      `<tr><td><strong>Rejected</strong></td><td>${rejectedCount > 0 ? `<ac:structured-macro ac:name="status"><ac:parameter ac:name="subtle">false</ac:parameter><ac:parameter ac:name="title">${rejectedCount} Rejected</ac:parameter><ac:parameter ac:name="color">Red</ac:parameter></ac:structured-macro>` : "None"}</td></tr>` +
      `<tr><td><strong>Blocked</strong></td><td>${blockedCount > 0 ? `<ac:structured-macro ac:name="status"><ac:parameter ac:name="subtle">false</ac:parameter><ac:parameter ac:name="title">${blockedCount} Blocked</ac:parameter><ac:parameter ac:name="color">Red</ac:parameter></ac:structured-macro>` : "None"}</td></tr>` +
      (avgRating != null ? `<tr><td><strong>Avg Review Rating</strong></td><td>${avgRating} / 5 <em style="color:#6a737d;">(${ratings.length} rated)</em></td></tr>` : "") +
      `</tbody></table>`
    );

  html += `<ac:layout><ac:layout-section ac:type="two_equal">`;
  html += `<ac:layout-cell>`;
  html += `<table style="width:100%;border-collapse:collapse;" border="1"><tbody>`;
  const dashRows = [
    ["Milestone",    escapeHtml(milestoneName)],
    ["Health Status", ragBadge(completionPct)],
    ["Completion",   `${doneCount} / ${totalCount} tickets &nbsp;<strong>(${completionPct}%)</strong>`],
    ["Story Points", `${doneSP} / ${totalSP} SP &nbsp;<strong>(${spPct}%)</strong>`],
    ["Start Date",   fmt(earliestStart) || "&ndash;"],
    ["Target End",   deadlineDate ? `${fmt(deadlineDate)} &nbsp;${daysInfo}` : "&ndash;"],
    ["Review Date",  reviewDate ? fmt(reviewDate) : "&ndash;"],
    ["Team Size",    `${uniqueAssignees} member${uniqueAssignees !== 1 ? "s" : ""}`],
    ["Generated",    timestamp],
  ];
  dashRows.forEach(([label, value]) => {
    html += `<tr>
      <td style="width:38%;padding:6px 10px;background:#f5f5f5;"><strong>${label}</strong></td>
      <td style="padding:6px 10px;">${value}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  html += `</ac:layout-cell>`;
  html += `<ac:layout-cell>${quickStats}</ac:layout-cell>`;
  html += `</ac:layout-section></ac:layout><hr/>`;

  // ==========================================================================
  // Section 4: Status Breakdown
  // ==========================================================================
  html += `<h2>📋 Status Breakdown</h2>`;
  html += `<table style="width:100%;border-collapse:collapse;" border="1">
    <tbody><tr>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:left;width:28%;"><strong>Status</strong></th>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:center;"><strong>Tickets</strong></th>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:center;"><strong>Story Points</strong></th>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:center;"><strong>% of Total</strong></th>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:left;"><strong>Assignees</strong></th>
    </tr>`;

  // Individual status buckets: collect every unique status from actual tickets,
  // sorted by a logical display order (done → in-flight → open → terminal).
  const STATUS_ORDER = [
    "Done", "Closed",
    "In Progress", "In Review", "Feedback", "Testing", "UAT",
    "To Do", "Open", "Backlog", "New", "Created",
    "Blocked",
    "Rejected", "Declined",
  ];
  const statusOrderIndex = (s) => {
    const i = STATUS_ORDER.findIndex(o => o.toLowerCase() === s.toLowerCase());
    return i === -1 ? STATUS_ORDER.length : i;
  };
  const uniqueStatuses = [...new Set(tickets.map(t => t.status).filter(Boolean))].sort(
    (a, b) => statusOrderIndex(a) - statusOrderIndex(b) || a.localeCompare(b)
  );

  const sbRows = uniqueStatuses.map(status => {
    const matched = tickets.filter(t => (t.status ?? "") === status);
    const count = matched.length;
    const sp = matched.reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0);
    const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    const assignees = [...new Set(matched.map(t => t.assigneeName || "Unassigned"))].sort();
    return { label: status, count, sp, pct, assignees };
  });

  sbRows.forEach(({ label, count, sp, pct, assignees }) => {
    if (count === 0) return;
    html += `<tr>
      <td style="padding:6px 10px;">${getStatusMacro(label)}</td>
      <td style="padding:6px 10px;text-align:center;font-weight:600;">${count}</td>
      <td style="padding:6px 10px;text-align:center;">${sp > 0 ? sp : "&ndash;"}</td>
      <td style="padding:6px 10px;text-align:center;">${pct}%</td>
      <td style="padding:6px 10px;font-size:11px;color:#42526e;">${escapeHtml(assignees.slice(0, 5).join(", ")) + (assignees.length > 5 ? " +" + (assignees.length - 5) + " more" : "")}</td>
    </tr>`;
  });
  html += `</tbody></table><hr/>`;

  // ==========================================================================
  // Section 5: Quality Signals
  // ==========================================================================
  const hasQuality = avgRating != null || rejectedCount > 0 || unassigned > 0 || noSp > 0 || blockedCount > 0;
  if (hasQuality) {
    html += `<h2>⚠️ Quality Signals</h2>`;
    const qualityRows = [];
    if (avgRating != null) qualityRows.push(["Avg Review Rating", `${avgRating} / 5 &nbsp;<em>(${ratings.length} rated)</em>`]);
    if (rejectedCount > 0) qualityRows.push(["Rejected / Declined", `${getStatusMacro("Rejected")} &nbsp;<strong>${rejectedCount}</strong> issues &nbsp;(${Math.round((rejectedCount / totalCount) * 100)}%)`]);
    if (blockedCount  > 0) qualityRows.push(["Blocked Issues",      `${getStatusMacro("Blocked")} &nbsp;<strong>${blockedCount}</strong>`]);
    if (unassigned    > 0) qualityRows.push(["Unassigned Issues",   `<strong style="color:#c67c00;">${unassigned}</strong>`]);
    if (noSp          > 0) qualityRows.push(["Issues Without SP Estimate", `<strong style="color:#c67c00;">${noSp}</strong>`]);

    const qualityTableBody = `<table style="width:100%;border-collapse:collapse;" border="1"><tbody>` +
      qualityRows.map(([l, v]) => `<tr><td style="width:38%;padding:6px 10px;background:#f5f5f5;"><strong>${l}</strong></td><td style="padding:6px 10px;">${v}</td></tr>`).join("") +
      `</tbody></table>`;

    const hasWarnings = rejectedCount > 0 || blockedCount > 0;
    html += hasWarnings
      ? callout("warning", "Quality signals require attention", qualityTableBody)
      : callout("note", "Quality signals", qualityTableBody);
    html += `<hr/>`;
  }

  // ==========================================================================
  // Section 6: Per-assignee detail tables (expand macro per person)
  // ==========================================================================
  html += `<h2>👥 Team Breakdown</h2>`;
  const groups = groupByAssignee(tickets);
  const sortedAssignees = Object.keys(groups).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  for (const assignee of sortedAssignees) {
    const assigneeTickets = groups[assignee];
    const aDone = assigneeTickets.filter(t => { const s = (t.status ?? "").toLowerCase(); return s === "done" || s === "closed"; }).length;
    const aTotalSP = assigneeTickets.reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0);
    const aDoneSP = assigneeTickets.filter(t => { const s = (t.status ?? "").toLowerCase(); return s === "done" || s === "closed"; }).reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0);
    const expandTitle = `👤 ${assignee}  •  ${aDone}/${assigneeTickets.length} tickets  •  ${aDoneSP}/${aTotalSP} SP`;
    const tableBody = await buildPersonTable(assigneeTickets, assignee);
    html +=
      `<ac:structured-macro ac:name="expand">` +
      `<ac:parameter ac:name="title">${escapeHtml(expandTitle)}</ac:parameter>` +
      `<ac:rich-text-body>${tableBody}</ac:rich-text-body>` +
      `</ac:structured-macro>`;
  }

  return html;
}
