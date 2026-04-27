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
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${r.bg};border:1px solid ${r.border};color:${r.text};font-weight:700;font-size:12px;">${r.label}</span>`;
}

function riskLevelBadge(level) {
  const colors = {
    Green: { bg: "#e3fcef", border: "#006644", text: "#006644" },
    Amber: { bg: "#fffae5", border: "#c67c00", text: "#c67c00" },
    Red:   { bg: "#ffebe6", border: "#c5203e", text: "#c5203e" },
  };
  const c = colors[level] ?? colors.Amber;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:${c.bg};border:1px solid ${c.border};color:${c.text};font-weight:700;font-size:11px;">${level}</span>`;
}

function bucketStatusColor(label) {
  const s = label.toLowerCase();
  if (s.includes("done") || s.includes("closed"))           return "#006644";
  if (s.includes("progress") || s.includes("review"))       return "#0052cc";
  if (s.includes("rejected") || s.includes("declined"))     return "#c5203e";
  if (s.includes("blocked"))                                 return "#c5203e";
  return "#6a737d";
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

  let html = `<h3 style="margin-top:20px;">${escapeHtml(personName)}</h3>`;
  html += `<table style="width:100%;border-collapse:collapse;margin:6px 0;"><tbody><tr>
    <td style="padding:4px 8px;"><strong>Assigned:</strong> ${total}</td>
    <td style="padding:4px 8px;"><strong>Done:</strong> ${done}/${total} (${pct}%)</td>
    <td style="padding:4px 8px;"><strong>Story Points:</strong> ${doneSP}/${totalSP}</td>
  </tr></tbody></table>`;

  html += `<table style="width:100%;border-collapse:collapse;" border="1">
    <colgroup>
      <col style="width:8%;"/><col style="width:60%;"/><col style="width:7%;"/>
      <col style="width:13%;"/><col style="width:12%;"/>
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

    const sc = bucketStatusColor(t.status ?? "");
    html += `<tr>
      <td style="padding:6px 8px;word-wrap:break-word;">${ticketLink}</td>
      <td style="padding:6px 8px;word-wrap:break-word;">${summaryHtml}</td>
      <td style="padding:6px 8px;text-align:center;">${t.sp != null ? escapeHtml(String(t.sp)) : ""}</td>
      <td style="padding:6px 8px;color:${sc};font-weight:600;">${escapeHtml(t.status || "")}</td>
      <td style="padding:6px 8px;word-wrap:break-word;">${escapeHtml(t.priority || "")}<br/>${escapeHtml(t.issueType || "")}</td>
    </tr>`;
  }
  html += `</tbody></table><hr/>`;
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
  if (deadlineDate) {
    const diff = Math.round((new Date(deadlineDate) - now) / 86400000);
    daysInfo = diff > 0
      ? `<span style="color:#006644;">${diff} days remaining</span>`
      : `<span style="color:#c5203e;">${Math.abs(diff)} days overdue</span>`;
  }

  // --- AI executive summary (graceful degradation) ---
  const aiData = await generateAIMilestoneSummary(tickets, milestoneName).catch(() => null);

  // ==========================================================================
  // Section 1: Header
  // ==========================================================================
  let html = `<h2 style="margin-bottom:4px;">${escapeHtml(milestoneName)}</h2>`;
  html += `<p style="color:#6a737d;font-size:12px;margin-top:0;">Generated: ${timestamp} &nbsp;|&nbsp; Health: ${ragBadge(completionPct)}</p>`;
  html += `<hr/>`;

  // ==========================================================================
  // Section 2: AI Executive Summary
  // ==========================================================================
  if (aiData) {
    const panelBg     = aiData.riskLevel === "Green" ? "#e3fcef" : aiData.riskLevel === "Red" ? "#ffebe6" : "#fffae5";
    const panelBorder = aiData.riskLevel === "Green" ? "#006644" : aiData.riskLevel === "Red" ? "#c5203e"  : "#c67c00";

    html += `<div style="background:${panelBg};border-left:4px solid ${panelBorder};padding:14px 16px;border-radius:4px;margin-bottom:20px;">`;
    html += `<h3 style="margin:0 0 8px 0;">AI Executive Assessment &nbsp;${riskLevelBadge(aiData.riskLevel)}</h3>`;
    html += `<p style="margin:0 0 12px 0;font-size:13px;">${escapeHtml(aiData.executiveSummary)}</p>`;

    if (aiData.keyRisks && aiData.keyRisks.length > 0) {
      html += `<p style="font-weight:700;margin:10px 0 4px 0;font-size:12px;">Key Risks</p><ul style="margin:0 0 10px 0;padding-left:20px;">`;
      aiData.keyRisks.forEach(r => { html += `<li style="font-size:12px;margin-bottom:4px;">${escapeHtml(r)}</li>`; });
      html += `</ul>`;
    }

    if (aiData.recommendations && aiData.recommendations.length > 0) {
      html += `<p style="font-weight:700;margin:10px 0 4px 0;font-size:12px;">Recommendations</p><ol style="margin:0 0 10px 0;padding-left:20px;">`;
      aiData.recommendations.forEach(r => { html += `<li style="font-size:12px;margin-bottom:4px;">${escapeHtml(r)}</li>`; });
      html += `</ol>`;
    }

    if (aiData.closingNote) {
      html += `<p style="font-size:12px;font-style:italic;margin:8px 0 0 0;color:#42526e;">${escapeHtml(aiData.closingNote)}</p>`;
    }
    html += `</div>`;
  }

  // ==========================================================================
  // Section 3: Health Dashboard
  // ==========================================================================
  html += `<h3>Health Dashboard</h3>`;
  html += `<table style="width:100%;border-collapse:collapse;" border="1"><tbody>`;

  const dashRows = [
    ["Milestone",    escapeHtml(milestoneName)],
    ["Health Status", ragBadge(completionPct)],
    ["Completion",   `${doneCount} / ${totalCount} tickets &nbsp;<strong>(${completionPct}%)</strong>`],
    ["Story Points", `${doneSP} / ${totalSP} SP &nbsp;<strong>(${totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0}%)</strong>`],
    ["Start Date",   fmt(earliestStart) || "&ndash;"],
    ["Target End",   deadlineDate ? `${fmt(deadlineDate)} &nbsp;${daysInfo}` : "&ndash;"],
    ["Review Date",  reviewDate ? fmt(reviewDate) : "&ndash;"],
    ["Team Size",    `${uniqueAssignees} member${uniqueAssignees !== 1 ? "s" : ""}`],
    ["Generated",    timestamp],
  ];

  dashRows.forEach(([label, value]) => {
    html += `<tr>
      <td style="width:28%;padding:6px 10px;background:#f5f5f5;"><strong>${label}</strong></td>
      <td style="padding:6px 10px;">${value}</td>
    </tr>`;
  });
  html += `</tbody></table><hr/>`;

  // ==========================================================================
  // Section 4: Status Breakdown
  // ==========================================================================
  html += `<h3>Status Breakdown</h3>`;
  html += `<table style="width:100%;border-collapse:collapse;" border="1">
    <tbody><tr>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:left;width:35%;"><strong>Status</strong></th>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:center;"><strong>Count</strong></th>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:center;"><strong>Story Points</strong></th>
      <th style="padding:6px 10px;background:#f5f5f5;text-align:center;"><strong>% of Total</strong></th>
    </tr>`;

  const buckets = [
    { label: "Done / Closed",       match: t => { const s = (t.status ?? "").toLowerCase(); return s === "done" || s === "closed"; } },
    { label: "In Progress",         match: t => { const s = (t.status ?? "").toLowerCase(); return s.includes("progress") || s.includes("review") || s.includes("testing") || s.includes("uat"); } },
    { label: "To Do / Open",        match: t => { const s = (t.status ?? "").toLowerCase(); return s === "to do" || s === "open" || s === "backlog" || s === "new" || s === "created"; } },
    { label: "Rejected / Declined", match: t => { const s = (t.status ?? "").toLowerCase(); return s === "rejected" || s === "declined"; } },
    { label: "Blocked",             match: t => { const s = (t.status ?? "").toLowerCase(); return s.includes("blocked") || s.includes("impediment"); } },
  ];

  const matchedIds = new Set();
  const bucketRows = buckets.map(b => {
    const matched = tickets.filter(t => b.match(t) && !matchedIds.has(t.id));
    matched.forEach(t => matchedIds.add(t.id));
    const count = matched.length;
    const sp = matched.reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0);
    const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return { label: b.label, count, sp, pct };
  });

  const otherTickets = tickets.filter(t => !matchedIds.has(t.id));
  if (otherTickets.length > 0) {
    bucketRows.push({
      label: "Other",
      count: otherTickets.length,
      sp: otherTickets.reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0),
      pct: totalCount > 0 ? Math.round((otherTickets.length / totalCount) * 100) : 0,
    });
  }

  bucketRows.forEach(({ label, count, sp, pct }) => {
    if (count === 0) return;
    const sc = bucketStatusColor(label);
    html += `<tr>
      <td style="padding:6px 10px;font-weight:600;color:${sc};">${label}</td>
      <td style="padding:6px 10px;text-align:center;">${count}</td>
      <td style="padding:6px 10px;text-align:center;">${sp}</td>
      <td style="padding:6px 10px;text-align:center;">${pct}%</td>
    </tr>`;
  });
  html += `</tbody></table><hr/>`;

  // ==========================================================================
  // Section 5: Quality Signals
  // ==========================================================================
  const hasQuality = avgRating != null || rejectedCount > 0 || unassigned > 0 || noSp > 0 || blockedCount > 0;
  if (hasQuality) {
    html += `<h3>Quality Signals</h3>`;
    html += `<table style="width:100%;border-collapse:collapse;" border="1"><tbody>`;

    if (avgRating != null) {
      html += `<tr>
        <td style="width:35%;padding:6px 10px;background:#f5f5f5;"><strong>Avg Review Rating</strong></td>
        <td style="padding:6px 10px;">${avgRating} / 5 &nbsp;<span style="color:#6a737d;font-size:11px;">(${ratings.length} rated)</span></td>
      </tr>`;
    }
    if (rejectedCount > 0) {
      html += `<tr>
        <td style="width:35%;padding:6px 10px;background:#f5f5f5;"><strong>Rejected / Declined</strong></td>
        <td style="padding:6px 10px;color:#c5203e;">${rejectedCount} issues (${Math.round((rejectedCount / totalCount) * 100)}%)</td>
      </tr>`;
    }
    if (blockedCount > 0) {
      html += `<tr>
        <td style="width:35%;padding:6px 10px;background:#f5f5f5;"><strong>Blocked Issues</strong></td>
        <td style="padding:6px 10px;color:#c5203e;">${blockedCount}</td>
      </tr>`;
    }
    if (unassigned > 0) {
      html += `<tr>
        <td style="width:35%;padding:6px 10px;background:#f5f5f5;"><strong>Unassigned Issues</strong></td>
        <td style="padding:6px 10px;color:#c67c00;">${unassigned}</td>
      </tr>`;
    }
    if (noSp > 0) {
      html += `<tr>
        <td style="width:35%;padding:6px 10px;background:#f5f5f5;"><strong>Issues Without SP Estimate</strong></td>
        <td style="padding:6px 10px;color:#c67c00;">${noSp}</td>
      </tr>`;
    }
    html += `</tbody></table><hr/>`;
  }

  // ==========================================================================
  // Section 6: Per-assignee detail tables
  // ==========================================================================
  html += `<h3>Team Breakdown</h3>`;
  const groups = groupByAssignee(tickets);
  const sortedAssignees = Object.keys(groups).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  for (const assignee of sortedAssignees) {
    html += await buildPersonTable(groups[assignee], assignee);
  }

  return html;
}
