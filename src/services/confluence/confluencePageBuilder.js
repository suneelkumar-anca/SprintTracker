import { fmtFull } from "../../utils/dateUtils.js";
import { fetchPullRequests } from "../jira/fetchPullRequests.js";

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(d) {
  const s = fmtFull(d);
  return s === "—" ? "" : s;
}

function buildInlinePRSummary(prs) {
  if (!prs || prs.length === 0) return "";
  
  let html = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">`;
  html += `<strong style="color: #0052cc; font-size: 11px;">PRs (${prs.length}):</strong>`;
  prs.forEach(pr => {
    const statusColor = pr.status === "MERGED" ? "#28a745" : pr.status === "OPEN" ? "#0052cc" : "#6a737d";
    html += `<div style="margin: 4px 0; font-size: 11px;">`;
    if (pr.url) {
      html += `<a href="${escapeHtml(pr.url)}" style="color: ${statusColor}; text-decoration: none;">${escapeHtml(pr.name)}</a>`;
    } else {
      html += `<span style="color: ${statusColor};">${escapeHtml(pr.name)}</span>`;
    }
    html += ` <span style="color: #999; font-size: 10px;">[${pr.status || "?"}]</span>`;
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

function getStatusColor(status) {
  // Status colors - text only (no background)
  const statusMap = {
    "Done": "#22a447",      // Green
    "Closed": "#22a447",    // Green
    "In Progress": "#0052cc", // Blue
    "In Review": "#0052cc",   // Blue
    "Rejected": "#d04623",    // Red
    "Declined": "#d04623",    // Red
    "Feedback": "#974f0c",    // Orange
    "To Do": "#626f86",       // Gray
  };
  return statusMap[status] || "#626f86";
}

function buildSprintHistoryBadge(ticket, currentSprintName) {
  if (!ticket.allSprints || ticket.allSprints.length <= 1) return "";
  
  const carriedFrom = ticket.allSprints
    .filter(s => s.name !== currentSprintName)
    .map(s => escapeHtml(s.name));
  
  if (carriedFrom.length === 0) return "";
  
  let html = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">`;
  html += `<strong style="color: #ff7d00; font-size: 11px;">Carried From:</strong>`;
  html += `<div style="margin: 4px 0; font-size: 11px; color: #666;">`;
  html += carriedFrom.join(", ");
  html += `</div></div>`;
  
  return html;
}

function groupTicketsByAssignee(tickets) {
  const groups = {};
  tickets.forEach(t => {
    const assignee = t.assigneeName || "Unassigned";
    if (!groups[assignee]) {
      groups[assignee] = [];
    }
    groups[assignee].push(t);
  });
  return groups;
}

async function buildPersonTable(personTickets, personName, currentSprintName) {
  const headers = ["Ticket", "Summary", "Story Points", "Priority<br/>Type"];
  
  let html = `<h3>${escapeHtml(personName)}</h3>`;
  
  // Person summary metrics
  const doneCount = personTickets.filter(t => t.status === "Done" || t.status === "Closed").length;
  const totalCount = personTickets.length;
  const totalSP = personTickets.reduce((sum, t) => sum + (t.sp || 0), 0);
  const doneSP = personTickets.filter(t => t.status === "Done" || t.status === "Closed").reduce((sum, t) => sum + (t.sp || 0), 0);
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  html += `<table style="width: 100%; border-collapse: collapse; margin: 8px 0;"><tbody><tr><td style="padding: 4px 8px;"><strong>Assigned:</strong> ${totalCount}</td><td style="padding: 4px 8px;"><strong>Done:</strong> ${doneCount}/${totalCount} (${completionPct}%)</td><td style="padding: 4px 8px;"><strong>Story Points:</strong> ${doneSP}/${totalSP}</td></tr></tbody></table>`;

  // Person's tickets table with inline status
  html += `<table style="width: 100%; border-collapse: collapse;" border="1"><colgroup><col style="width: 8%;"/><col style="width: 76%;"/><col style="width: 8%;"/><col style="width: 8%;"/></colgroup><tbody><tr>`;
  headers.forEach((h, idx) => {
    const headerHtml = escapeHtml(h).replace(/&lt;br\/&gt;/g, '<br/>');
    html += `<th style="padding: 6px 8px; word-wrap: break-word; overflow-wrap: break-word; background-color: #f5f5f5;"><strong>${headerHtml}</strong></th>`;
  });
  html += `</tr>`;

  for (const t of personTickets) {
    const ticketLink = t.jiraUrl ? `<a href="${escapeHtml(t.jiraUrl)}">${escapeHtml(t.id)}</a>` : escapeHtml(t.id || "");
    
    // Start with description
    let summaryHtml = escapeHtml(t.description || "");
    
    // Add inline status badge with proper spacing
    const statusColor = getStatusColor(t.status);
    summaryHtml += `<div style="margin: 6px 0 0 0; padding-top: 4px;">`;
    summaryHtml += `<span style="display: inline-block !important; padding: 2px 0 !important; color: ${statusColor} !important; font-size: 12px !important; font-weight: 700 !important; white-space: nowrap !important;">${escapeHtml(t.status)}</span>`;
    summaryHtml += `</div>`;
    
    // Add sprint history if ticket is carried over
    summaryHtml += buildSprintHistoryBadge(t, currentSprintName);
    
    // Fetch and append related PRs for this ticket
    try {
      if (t.numericId) {
        const prs = await fetchPullRequests(t.numericId);
        if (prs && prs.length > 0) {
          summaryHtml += buildInlinePRSummary(prs);
        }
      }
    } catch (err) {
      console.debug(`Could not fetch PRs for ticket ${t.id}:`, err.message);
      // Continue without PR data - don't fail the entire page generation
    }
    
    const cells = [
      ticketLink,
      summaryHtml,
      t.sp !== null && t.sp !== undefined ? escapeHtml(String(t.sp)) : "",
      `${escapeHtml(t.priority || "")}<br/>${escapeHtml(t.issueType || "")}`,
    ];
    html += `<tr>`;
    cells.forEach((cell, idx) => {
      // First cell (Ticket) is text, second cell (Summary with status/history/PRs) is HTML safe, fourth cell (Type/Priority with br) is HTML safe
      if (idx === 0 || idx === 1 || idx === 3) {
        html += `<td style="padding: 6px 8px; word-wrap: break-word; overflow-wrap: break-word;">${cell}</td>`;
      } else {
        html += `<td style="padding: 6px 8px; word-wrap: break-word; overflow-wrap: break-word;">${escapeHtml(String(cell))}</td>`;
      }
    });
    html += `</tr>`;
  }

  html += `</tbody></table><hr/>`;
  return html;
}

function buildPersonSummaryTable(groups, tickets) {
  const personStats = [];
  
  Object.entries(groups).forEach(([assignee, assigneeTickets]) => {
    const done = assigneeTickets.filter(t => t.status === "Done" || t.status === "Closed").length;
    const total = assigneeTickets.length;
    const totalSP = assigneeTickets.reduce((sum, t) => sum + (t.sp || 0), 0);
    const doneSP = assigneeTickets.filter(t => t.status === "Done" || t.status === "Closed").reduce((sum, t) => sum + (t.sp || 0), 0);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    
    personStats.push({
      assignee,
      total,
      done,
      pct,
      totalSP,
      doneSP,
    });
  });
  
  // Sort by completion percentage descending
  personStats.sort((a, b) => b.pct - a.pct);
  
  let html = `<h2>Team Contribution Summary</h2>`;
  html += `<table style="width: 100%; border-collapse: collapse;" border="1"><tbody><tr>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>Team Member</strong></th>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>Assigned</strong></th>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>Completed</strong></th>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>% Complete</strong></th>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>Story Points</strong></th>`;
  html += `</tr>`;
  
  personStats.forEach(stat => {
    const barColor = stat.pct === 100 ? "#22a447" : stat.pct >= 50 ? "#f5cd47" : "#ae2a19";
    html += `<tr>`;
    html += `<td style="padding: 6px 8px;"><strong>${escapeHtml(stat.assignee)}</strong></td>`;
    html += `<td style="padding: 6px 8px; text-align: center;">${stat.total}</td>`;
    html += `<td style="padding: 6px 8px; text-align: center;"><span style="color: #22a447; font-weight: 600;">${stat.done}</span>/${stat.total}</td>`;
    html += `<td style="padding: 6px 8px; text-align: center;">`;
    html += `<div style="display: inline-block; width: 60px; height: 20px; background-color: #f0f0f0; border-radius: 3px; position: relative; overflow: hidden;">`;
    html += `<div style="height: 100%; width: ${stat.pct}%; background-color: ${barColor}; transition: width 0.3s ease;"></div>`;
    html += `<span style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #333;">${stat.pct}%</span>`;
    html += `</div></td>`;
    html += `<td style="padding: 6px 8px; text-align: center;"><span style="color: #0052cc; font-weight: 600;">${stat.doneSP}</span>/${stat.totalSP}</td>`;
    html += `</tr>`;
  });
  
  html += `</tbody></table><hr/>`;
  return html;
}

export async function buildConfluencePersonReport(tickets, sprintName) {
  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const totalCount = tickets.length;
  const doneCount = tickets.filter(t => t.status === "Done" || t.status === "Closed").length;
  const totalSP = tickets.reduce((sum, t) => sum + (t.sp || 0), 0);
  const doneSP = tickets.filter(t => t.status === "Done" || t.status === "Closed").reduce((sum, t) => sum + (t.sp || 0), 0);
  const uniqueAssignees = new Set(tickets.map(t => t.assigneeName || "Unassigned")).size;

  // Sprint summary
  let html = `<h2>Sprint: ${escapeHtml(sprintName)} - Report</h2>`;
  html += `<table style="width: 100%; border-collapse: collapse;" border="1"><tbody><tr><td style="width: 30%; padding: 6px 8px;"><strong>Total Tickets:</strong></td><td style="width: 70%; padding: 6px 8px;">${totalCount}</td></tr><tr><td style="width: 30%; padding: 6px 8px;"><strong>Done:</strong></td><td style="width: 70%; padding: 6px 8px;">${doneCount} / ${totalCount} (${totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%)</td></tr><tr><td style="width: 30%; padding: 6px 8px;"><strong>Story Points:</strong></td><td style="width: 70%; padding: 6px 8px;">${doneSP} / ${totalSP}</td></tr><tr><td style="width: 30%; padding: 6px 8px;"><strong>Team Members:</strong></td><td style="width: 70%; padding: 6px 8px;">${uniqueAssignees}</td></tr><tr><td style="width: 30%; padding: 6px 8px;"><strong>Generated:</strong></td><td style="width: 70%; padding: 6px 8px;">${timestamp}</td></tr></tbody></table><hr/>`;

  // Group by assignee and build per-person sections
  const groups = groupTicketsByAssignee(tickets);
  
  // Add team contribution summary table
  html += buildPersonSummaryTable(groups, tickets);

  const sortedAssignees = Object.keys(groups).sort();

  for (const assignee of sortedAssignees) {
    html += await buildPersonTable(groups[assignee], assignee, sprintName);
  }

  return html;
}

// Legacy function for backward compatibility (still used in tests)
export function buildConfluenceTable(tickets, sprintName) {
  const headers = [
    "Ticket ID", "Summary", "Assignee", "Status", "Story Points", "Time Spent",
    "Priority", "Type", "Sprint",
    "Start Date", "End Date", "Created",
    "Reporter", "Labels", "Components",
    "Jira URL", "TL Comment", "Review Rating",
  ];
  const colWidths = ["8%", "15%", "10%", "8%", "7%", "7%", "8%", "8%", "8%", "6%", "6%", "6%", "10%", "8%", "8%", "8%", "8%", "8%"];

  let html = `<table style="width: 100%; border-collapse: collapse;"><tbody>`;
  html += `<tr>`;
  headers.forEach((h, idx) => {
    html += `<th style="width: ${colWidths[idx]}; padding: 8px; word-wrap: break-word; overflow-wrap: break-word;"><strong>${escapeHtml(h)}</strong></th>`;
  });
  html += `</tr>`;

  tickets.forEach(t => {
    const cells = [
      escapeHtml(t.id || ""),
      escapeHtml(t.description || ""),
      escapeHtml(t.assigneeName || ""),
      escapeHtml(t.status || ""),
      t.sp !== null && t.sp !== undefined ? escapeHtml(String(t.sp)) : "",
      escapeHtml(t.timeSpent || ""),
      escapeHtml(t.priority || ""),
      escapeHtml(t.issueType || ""),
      escapeHtml(t.sprintName || sprintName),
      formatDate(t.startDate),
      formatDate(t.endDate),
      formatDate(t.created),
      escapeHtml(t.reporter || ""),
      escapeHtml((t.labels || []).join(", ")),
      escapeHtml((t.components || []).join(", ")),
      t.jiraUrl ? `<a href="${escapeHtml(t.jiraUrl)}">${escapeHtml(t.jiraUrl)}</a>` : "",
      escapeHtml(typeof t.tlComment === "string" ? t.tlComment : ""),
      t.reviewRating !== null && t.reviewRating !== undefined ? escapeHtml(String(t.reviewRating)) : "",
    ];
    html += `<tr>`;
    cells.forEach((cell, idx) => {
      html += `<td style="width: ${colWidths[idx]}; padding: 8px; word-wrap: break-word; overflow-wrap: break-word;">${cell}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

export async function buildConfluencePage(tickets, sprintName) {
  return await buildConfluencePersonReport(tickets, sprintName);
}
