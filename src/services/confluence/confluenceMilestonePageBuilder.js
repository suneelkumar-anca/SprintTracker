import { fmtFull } from "../../utils/dateUtils.js";
import { fetchPullRequests } from "../jira/fetchPullRequests.js";

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildInlinePRSummary(prs) {
  if (!prs || prs.length === 0) return "";
  let html = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">`;
  html += `<strong style="color: #0052cc; font-size: 11px;">PRs (${prs.length}):</strong>`;
  prs.forEach((pr) => {
    const statusColor = pr.status === "MERGED" ? "#28a745" : pr.status === "OPEN" ? "#0052cc" : "#6a737d";
    html += `<div style="margin: 4px 0; font-size: 11px;">`;
    html += pr.url ? `<a href="${escapeHtml(pr.url)}" style="color: ${statusColor}; text-decoration: none;">${escapeHtml(pr.name)}</a>` : `<span style="color: ${statusColor};">${escapeHtml(pr.name)}</span>`;
    html += ` <span style="color: #999; font-size: 10px;">[${pr.status || "?"}]</span></div>`;
  });
  html += `</div>`;
  return html;
}

function groupTicketsByAssignee(tickets) {
  const groups = {};
  tickets.forEach((t) => {
    const assignee = t.assigneeName || "Unassigned";
    if (!groups[assignee]) groups[assignee] = [];
    groups[assignee].push(t);
  });
  return groups;
}

async function buildPersonTable(personTickets, personName) {
  const headers = ["Ticket", "Summary", "Story Points", "Priority<br/>Type"];
  let html = `<h3>${escapeHtml(personName)}</h3>`;
  const doneCount = personTickets.filter((t) => t.status === "Done" || t.status === "Closed").length;
  const totalCount = personTickets.length;
  const totalSP = personTickets.reduce((sum, t) => sum + (t.sp || 0), 0);
  const doneSP = personTickets.filter((t) => t.status === "Done" || t.status === "Closed").reduce((sum, t) => sum + (t.sp || 0), 0);
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  html += `<table style="width: 100%; border-collapse: collapse; margin: 8px 0;"><tbody><tr><td style="padding: 4px 8px;"><strong>Assigned:</strong> ${totalCount}</td><td style="padding: 4px 8px;"><strong>Done:</strong> ${doneCount}/${totalCount} (${completionPct}%)</td><td style="padding: 4px 8px;"><strong>Story Points:</strong> ${doneSP}/${totalSP}</td></tr></tbody></table>`;
  html += `<table style="width: 100%; border-collapse: collapse;" border="1"><colgroup><col style="width: 8%;"/><col style="width: 76%;"/><col style="width: 8%;"/><col style="width: 8%;"/></colgroup><tbody><tr>`;
  headers.forEach((h, idx) => {
    const headerHtml = escapeHtml(h).replace(/&lt;br\/&gt;/g, "<br/>");
    html += `<th style="padding: 6px 8px; word-wrap: break-word; background-color: #f5f5f5;"><strong>${headerHtml}</strong></th>`;
  });
  html += `</tr>`;
  for (const t of personTickets) {
    const ticketLink = t.jiraUrl ? `<a href="${escapeHtml(t.jiraUrl)}">${escapeHtml(t.id)}</a>` : escapeHtml(t.id || "");
    let summaryHtml = escapeHtml(t.description || "");
    try {
      if (t.numericId) {
        const prs = await fetchPullRequests(t.numericId);
        if (prs && prs.length > 0) summaryHtml += buildInlinePRSummary(prs);
      }
    } catch (err) {
      console.debug(`Could not fetch PRs for ${t.id}:`, err.message);
      // Continue without PR data - don't fail the entire page generation
    }
    const cells = [ticketLink, summaryHtml, t.sp !== null && t.sp !== undefined ? escapeHtml(String(t.sp)) : "", `${escapeHtml(t.priority || "")}<br/>${escapeHtml(t.issueType || "")}`];
    html += `<tr>`;
    cells.forEach((cell, idx) => {
      html += `<td style="padding: 6px 8px; word-wrap: break-word;">${idx === 1 || idx === 3 ? cell : escapeHtml(String(cell))}</td>`;
    });
    html += `</tr>`;
  }
  html += `</tbody></table><hr/>`;
  return html;
}

export async function buildMilestonePage(tickets, milestoneName, deadlineDate) {
  const timestamp = new Date().toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const totalCount = tickets.length;
  const doneCount = tickets.filter((t) => t.status === "Done" || t.status === "Closed").length;
  const totalSP = tickets.reduce((sum, t) => sum + (t.sp || 0), 0);
  const doneSP = tickets.filter((t) => t.status === "Done" || t.status === "Closed").reduce((sum, t) => sum + (t.sp || 0), 0);
  const uniqueAssignees = new Set(tickets.map((t) => t.assigneeName || "Unassigned")).size;

  let html = `<h2>Milestone: ${escapeHtml(milestoneName)} - Report</h2>`;
  const today = new Date();
  const deadline = deadlineDate ? new Date(deadlineDate) : null;
  let daysInfo = "";
  if (deadline) {
    const diffMs = deadline - today;
    const diffDays = Math.round(diffMs / 86400000);
    daysInfo = diffDays > 0 ? ` (${diffDays} days remaining)` : ` (${Math.abs(diffDays)} days overdue)`;
  }

  html += `<table style="width: 100%; border-collapse: collapse;" border="1"><tbody>`;
  html += `<tr><td style="width: 30%; padding: 6px 8px;"><strong>Total Tickets:</strong></td><td style="width: 70%; padding: 6px 8px;">${totalCount}</td></tr>`;
  html += `<tr><td style="width: 30%; padding: 6px 8px;"><strong>Done:</strong></td><td style="width: 70%; padding: 6px 8px;">${doneCount} / ${totalCount} (${totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%)</td></tr>`;
  html += `<tr><td style="width: 30%; padding: 6px 8px;"><strong>Story Points:</strong></td><td style="width: 70%; padding: 6px 8px;">${doneSP} / ${totalSP}</td></tr>`;
  html += `<tr><td style="width: 30%; padding: 6px 8px;"><strong>Deadline:</strong></td><td style="width: 70%; padding: 6px 8px;">${deadlineDate}${daysInfo}</td></tr>`;
  html += `<tr><td style="width: 30%; padding: 6px 8px;"><strong>Team Members:</strong></td><td style="width: 70%; padding: 6px 8px;">${uniqueAssignees}</td></tr>`;
  html += `<tr><td style="width: 30%; padding: 6px 8px;"><strong>Generated:</strong></td><td style="width: 70%; padding: 6px 8px;">${timestamp}</td></tr>`;
  html += `</tbody></table><hr/>`;

  const groups = groupTicketsByAssignee(tickets);
  const sortedAssignees = Object.keys(groups).sort();
  for (const assignee of sortedAssignees) {
    html += await buildPersonTable(groups[assignee], assignee);
  }

  return html;
}
