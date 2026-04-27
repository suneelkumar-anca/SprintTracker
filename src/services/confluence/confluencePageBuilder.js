import { fmtFull } from "../../utils/dateUtils.js";
import { fetchPullRequests } from "../jira/fetchPullRequests.js";
import { fetchComments } from "../jira/fetchComments.js";
import { generateAIRetrospective, generateAIParticipantSummaries } from "../ai/githubCopilotClient.js";

/**
 * Runs an async map with a concurrency limit so we never fire hundreds of
 * parallel Jira dev-status requests at once, which causes 5s timeouts.
 */
async function batchedMap(items, fn, concurrency = 10) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/** In-memory PR cache — avoids duplicate Jira dev-status API calls within one publish run. */
const _prCache = new Map();
async function fetchPullRequestsCached(numericId) {
  if (!numericId) return [];
  const key = String(numericId);
  if (_prCache.has(key)) return _prCache.get(key);
  const prs = await fetchPullRequests(numericId);
  _prCache.set(key, prs);
  return prs;
}

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

function getStatusBadge(status) {
  // Map Jira statuses to Confluence status macro colors and titles
  const statusMap = {
    "Done": { color: "Green", title: "Done" },
    "Closed": { color: "Green", title: "Closed" },
    "In Progress": { color: "Blue", title: "In Progress" },
    "In Review": { color: "Blue", title: "In Review" },
    "Rejected": { color: "Red", title: "Rejected" },
    "Declined": { color: "Red", title: "Declined" },
    "Feedback": { color: "Yellow", title: "Feedback" },
    "To Do": { color: "Grey", title: "To Do" },
  };
  const config = statusMap[status] || { color: "Grey", title: status };
  
  // Return Confluence status macro HTML
  return `<ac:structured-macro ac:name="status">
    <ac:parameter ac:name="subtle">false</ac:parameter>
    <ac:parameter ac:name="title">${escapeHtml(config.title)}</ac:parameter>
    <ac:parameter ac:name="color">${config.color}</ac:parameter>
  </ac:structured-macro>`;
}

function getPriorityBadge(priority) {
  // Map Jira priorities to Confluence status macro colors
  const priorityMap = {
    "Highest": { color: "Red", title: "Highest" },
    "High": { color: "Yellow", title: "High" },
    "Medium": { color: "Yellow", title: "Medium" },
    "Low": { color: "Green", title: "Low" },
    "Lowest": { color: "Blue", title: "Lowest" },
  };
  const config = priorityMap[priority] || { color: "Grey", title: priority || "Unset" };
  
  // Return Confluence status macro HTML
  return `<ac:structured-macro ac:name="status">
    <ac:parameter ac:name="subtle">false</ac:parameter>
    <ac:parameter ac:name="title">${escapeHtml(config.title)}</ac:parameter>
    <ac:parameter ac:name="color">${config.color}</ac:parameter>
  </ac:structured-macro>`;
}

function getTypeBadge(type) {
  // Map Jira issue types to Confluence status macro colors
  const typeMap = {
    "Story": { color: "Blue", title: "Story" },
    "Task": { color: "Blue", title: "Task" },
    "Bug": { color: "Red", title: "Bug" },
    "Epic": { color: "Purple", title: "Epic" },
    "Sub-task": { color: "Green", title: "Sub-task" },
    "Subtask": { color: "Green", title: "Subtask" },
  };
  const config = typeMap[type] || { color: "Grey", title: type || "Unset" };
  
  // Return Confluence status macro HTML
  return `<ac:structured-macro ac:name="status">
    <ac:parameter ac:name="subtle">false</ac:parameter>
    <ac:parameter ac:name="title">${escapeHtml(config.title)}</ac:parameter>
    <ac:parameter ac:name="color">${config.color}</ac:parameter>
  </ac:structured-macro>`;
}

function buildSprintHistoryBadge(ticket, currentSprintName) {
  if (!ticket.allSprints || ticket.allSprints.length === 0) return "";
  
  // Sort sprints by number (descending - latest first)
  const sortedSprints = [...ticket.allSprints].sort((a, b) => {
    const aNum = parseInt(a.name.match(/\d+$/)?.[0] || "0");
    const bNum = parseInt(b.name.match(/\d+$/)?.[0] || "0");
    return bNum - aNum; // Descending order
  });
  
  const allSprintNames = sortedSprints.map(s => escapeHtml(s.name));
  const sprintCount = allSprintNames.length;
  
  if (sprintCount === 0) return "";
  
  let html = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">`;
  html += `<strong style="color: #ff7d00; font-size: 11px;">Sprints (${sprintCount}):</strong>`;
  html += `<div style="margin: 4px 0; font-size: 11px; color: #666;">`;
  html += allSprintNames.join(", ");
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

  html += `<table style="width: 100%; border-collapse: collapse; margin: 8px 0;"><tbody><tr><td style="padding: 4px 8px;"><strong>Assigned:</strong> ${totalCount}</td><td style="padding: 4px 8px;"><strong>Jira Tickets Completed:</strong> ${doneCount}/${totalCount} (${completionPct}%)</td><td style="padding: 4px 8px;"><strong>Story Points:</strong> ${doneSP}/${totalSP}</td></tr></tbody></table>`;

  // Pre-fetch all PRs in parallel (batched, cached) so row rendering is synchronous
  const prResults = await batchedMap(personTickets, async t => {
    if (!t.numericId) return [];
    try { return await fetchPullRequestsCached(t.numericId); }
    catch { return []; }
  });

  // Person's tickets table with inline status
  html += `<table style="width: 100%; border-collapse: collapse;" border="1"><colgroup><col style="width: 8%;"/><col style="width: 76%;"/><col style="width: 8%;"/><col style="width: 8%;"/></colgroup><tbody><tr>`;
  headers.forEach((h) => {
    const headerHtml = escapeHtml(h).replace(/&lt;br\/&gt;/g, '<br/>');
    html += `<th style="padding: 6px 8px; word-wrap: break-word; overflow-wrap: break-word; background-color: #f5f5f5;"><strong>${headerHtml}</strong></th>`;
  });
  html += `</tr>`;

  personTickets.forEach((t, idx) => {
    const ticketLink = t.jiraUrl ? `<a href="${escapeHtml(t.jiraUrl)}">${escapeHtml(t.id)}</a>` : escapeHtml(t.id || "");
    
    let summaryHtml = escapeHtml(t.description || "");
    summaryHtml += `<div style="margin: 6px 0 0 0; padding-top: 4px;">`;
    summaryHtml += getStatusBadge(t.status);
    summaryHtml += `</div>`;
    summaryHtml += buildSprintHistoryBadge(t, currentSprintName);

    const prs = prResults[idx];
    if (prs && prs.length > 0) {
      summaryHtml += buildInlinePRSummary(prs);
    }
    
    let priorityTypeHtml = getPriorityBadge(t.priority);
    priorityTypeHtml += `<div style="margin-top: 4px;">`;
    priorityTypeHtml += getTypeBadge(t.issueType);
    priorityTypeHtml += `</div>`;
    
    const cells = [
      ticketLink,
      summaryHtml,
      t.sp !== null && t.sp !== undefined ? escapeHtml(String(t.sp)) : "",
      priorityTypeHtml,
    ];
    html += `<tr>`;
    cells.forEach((cell, i) => {
      if (i === 0 || i === 1 || i === 3) {
        html += `<td style="padding: 6px 8px; word-wrap: break-word; overflow-wrap: break-word;">${cell}</td>`;
      } else {
        html += `<td style="padding: 6px 8px; word-wrap: break-word; overflow-wrap: break-word;">${escapeHtml(String(cell))}</td>`;
      }
    });
    html += `</tr>`;
  });

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
  
  // Sort by story points completed descending, then ticket count as tiebreaker
  personStats.sort((a, b) => b.doneSP - a.doneSP || b.done - a.done);
  
  let html = `<h2>Team Contribution Summary</h2>`;
  html += `<table style="width: 100%; border-collapse: collapse;" border="1"><tbody><tr>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>Team Member</strong></th>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>Jira Tickets Completed</strong></th>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>% Jira Completion</strong></th>`;
  html += `<th style="padding: 6px 8px; background-color: #f5f5f5;"><strong>Story Points</strong></th>`;
  html += `</tr>`;
  
  personStats.forEach(stat => {
    const barColor = stat.pct === 100 ? "#22a447" : stat.pct >= 50 ? "#f5cd47" : "#ae2a19";
    html += `<tr>`;
    html += `<td style="padding: 6px 8px;"><strong>${escapeHtml(stat.assignee)}</strong></td>`;
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

async function generateSprintRetrospective(tickets, sprintName) {
  const token = import.meta.env.VITE_GITHUB_TOKEN;

  // Try AI-powered retrospective first (if GitHub token available)
  if (token) {
    try {
      // Extract comprehensive ticket and PR data for detailed analysis
      const detailedTicketData = [];
      const allPRData = [];

      // Fetch detailed data for each ticket — batched to avoid overwhelming the Jira dev-status API
      const detailedTickets = await batchedMap(tickets, async t => {
        const ticketDetail = {
          id: t.id,
          description: t.description,
          status: t.status,
          priority: t.priority,
          type: t.issueType,
          sp: t.sp,
          timeSpent: t.timeSpent,
          assignee: t.assigneeName,
          reporter: t.reporter,
          created: t.created,
          updated: t.updated,
          labels: t.labels || [],
          components: (t.components || []).join(', '),
          tlComment: t.tlComment,
          reviewRating: t.reviewRating,
          descriptionBody: t.descriptionBody,
        };

        // Fetch comments for this ticket
        try {
          const comments = await fetchComments(t.id);
          ticketDetail.comments = comments.map(c => ({ author: c.author, body: c.body }));
        } catch (err) {
          ticketDetail.comments = [];
        }

        // Fetch PRs for this ticket (cached — shares results with table builder)
        try {
          if (t.numericId) {
            const prs = await fetchPullRequestsCached(t.numericId);
            if (prs && prs.length > 0) {
              ticketDetail.prs = prs.map(pr => ({
                name: pr.name,
                status: pr.status,
                author: pr.author,
                repo: pr.repo,
              }));
              allPRData.push(...ticketDetail.prs);
            }
          }
        } catch (err) {
          ticketDetail.prs = [];
        }

        return ticketDetail;
      }, 4);
      detailedTicketData.push(...detailedTickets);

      // Analyze patterns from detailed data
      const analysisPatterns = {
        highPriorityCount: detailedTickets.filter(t => t.priority === 'High' || t.priority === 'Highest').length,
        bugsCount: detailedTickets.filter(t => t.type === 'Bug').length,
        noTimeTrackingCount: detailedTickets.filter(t => !t.timeSpent || t.timeSpent === '0s').length,
        withCommentsCount: detailedTickets.filter(t => t.comments && t.comments.length > 0).length,
        withReviewsCount: detailedTickets.filter(t => t.reviewRating !== null && t.reviewRating !== undefined).length,
        withTLCommentsCount: detailedTickets.filter(t => t.tlComment).length,
        blockedTicketsCount: detailedTickets.filter(t => t.status === 'In Progress' || t.status === 'Blocked').length,
        prsStatus: allPRData.reduce((acc, pr) => {
          acc[pr.status] = (acc[pr.status] || 0) + 1;
          return acc;
        }, {}),
      };

      // Build comprehensive context for AI — smart sample: pick the most informative tickets
      // Prioritise: bugs, high-priority, with TL comments, with review ratings, with PRs
      const scored = detailedTickets.map(t => ({
        t,
        score: (t.type === 'Bug' ? 3 : 0) +
               (t.priority === 'High' || t.priority === 'Highest' ? 2 : 0) +
               (t.tlComment ? 2 : 0) +
               (t.reviewRating != null ? 1 : 0) +
               (t.prs && t.prs.length > 0 ? 1 : 0),
      }));
      scored.sort((a, b) => b.score - a.score);
      const sampleTickets = scored.slice(0, 15).map(({ t }) => ({
        id: t.id,
        description: t.description,
        status: t.status,
        priority: t.priority,
        type: t.type,
        sp: t.sp,
        reviewRating: t.reviewRating,
        tlComment: t.tlComment,
        prs: t.prs ? t.prs.length : 0,
      }));

      const feedbackContext = {
        detailedTickets: JSON.stringify(sampleTickets, null, 0),
        patterns: JSON.stringify(analysisPatterns, null, 0),
        tlComments: detailedTickets.filter(t => t.tlComment).map(t => `${t.id}: ${t.tlComment}`).slice(0, 10),
        reviewInsights: detailedTickets.filter(t => t.reviewRating !== null).map(t => `${t.id}: Rating ${t.reviewRating}/5`).slice(0, 10),
        issues: detailedTickets.filter(t => t.type === 'Bug').map(t => `${t.id} - ${t.description}`).slice(0, 10),
      };

      const aiRetro = await generateAIRetrospective(tickets, sprintName, token, feedbackContext);
      if (aiRetro) {
        console.log("✅ Using AI-powered retrospective with comprehensive ticket & PR analysis");
        return aiRetro;
      }
    } catch (err) {
      console.warn("AI retrospective unavailable, using heuristic fallback:", err.message);
    }
  }

  // Fallback to heuristic-based retrospective analysis
  try {
    const totalCount = tickets.length;
    const doneCount = tickets.filter(t => t.status === "Done" || t.status === "Closed").length;
    const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const totalSP = tickets.reduce((sum, t) => sum + (t.sp || 0), 0);
    const doneSP = tickets.filter(t => t.status === "Done" || t.status === "Closed").reduce((sum, t) => sum + (t.sp || 0), 0);
    
    const statusCounts = {};
    tickets.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    
    const carriedOverCount = tickets.filter(t => t.allSprints && t.allSprints.length > 1).length;
    const avgSPPerTicket = totalCount > 0 ? (totalSP / totalCount).toFixed(1) : 0;
    const doneSPRate = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0;
    const inProgressCount = statusCounts["In Progress"] || 0;
    const rejectedCount = statusCounts["Rejected"] || statusCounts["Declined"] || 0;
    
    // Analyze patterns from actual data
    const highPriorityCount = tickets.filter(t => t.priority === 'High' || t.priority === 'Highest').length;
    const bugCount = tickets.filter(t => t.issueType === 'Bug').length;
    const bugsDelivered = tickets.filter(t => (t.status === 'Done' || t.status === 'Closed') && t.issueType === 'Bug').length;
    const blockedCount = tickets.filter(t => t.status === 'Blocked').length;
    
    const wentWell = [];
    const needsImprovement = [];
    const actionItems = [];
    
    // Build heuristic retrospective with constructive language & technical-first structure
    // TECHNICAL PRIMARY, METRICS SECONDARY
    
    // What Went Well - Technical insights first, metrics second (each as separate array item)
    const doneHighPriority = tickets.filter(t => (t.status === 'Done' || t.status === 'Closed') && (t.priority === 'High' || t.priority === 'Highest')).length;

    if (doneCount > 0) {
      wentWell.push(`Sprint delivery: ${doneCount} of ${totalCount} tickets completed (${completionPct}%) — team maintained forward momentum throughout the sprint`);
    }

    if (doneHighPriority > 0) {
      wentWell.push(`High-priority focus: ${doneHighPriority} of ${highPriorityCount} high-priority items delivered — team correctly prioritized impact-first work`);
    }

    if (bugsDelivered > 0 && bugCount > 0) {
      wentWell.push(`Technical debt addressed: ${bugsDelivered} of ${bugCount} bug/quality issues resolved — proactive reduction of technical liability`);
    }

    if (rejectedCount === 0 && totalCount > 0) {
      wentWell.push(`Quality discipline: zero rejected items across all deliverables — solid review process and definition-of-done adherence`);
    }

    if (carriedOverCount === 0) {
      wentWell.push(`Clean sprint boundary: no work spilled into next sprint — scope alignment and capacity planning were accurate`);
    }

    if (doneSP > 0 && totalSP > 0) {
      const spPct = Math.round((doneSP / totalSP) * 100);
      wentWell.push(`Story point delivery: ${doneSP} of ${totalSP} SP completed (${spPct}%) — demonstrates capacity alignment with committed scope`);
    }
    
    // What Needs Improvement - Technical insights first, metrics second
    if (inProgressCount > totalCount * 0.25) {
      needsImprovement.push(`Pattern: Work-in-progress bottleneck with ${inProgressCount} items still in flight — suggests either dependency chains or context switching. Consider finishing started work before new intake. Currently ${inProgressCount}/${totalCount} tickets (${Math.round((inProgressCount/totalCount)*100)}% of sprint)`);
    }
    
    if (blockedCount > 0) {
      needsImprovement.push(`Blocked items identified: ${blockedCount} tickets — indicates external dependency or infrastructure constraint we need to surface earlier`);
    }
    
    if (completionPct < 75 || carriedOverCount > 0) {
      let techIssue = `Scope or planning gap emerged — `;
      if (completionPct < 50) {
        techIssue += `only ${completionPct}% completion suggests planning/estimation misalignment`;
      } else if (completionPct < 75) {
        techIssue += `${100-completionPct}% incomplete indicates blockers weren't surfaced early`;
      }
      if (carriedOverCount > totalCount * 0.15) {
        techIssue += ` plus ${carriedOverCount} tickets carried over (${Math.round((carriedOverCount/totalCount)*100)}%)`;
      }
      needsImprovement.push(techIssue);
    }
    
    // Action Items - Technical actions first, metrics second
    if (inProgressCount > totalCount * 0.25 || blockedCount > 0) {
      actionItems.push(`Implement blocker surfacing: Daily standup should call out blocking items by noon — unblock or descope same day. Target: reduce in-progress from ${inProgressCount} to ≤${Math.ceil(totalCount*0.15)} by sprint day 5`);
    }
    
    if (completionPct < 75) {
      actionItems.push(`Review ticket complexity estimation — average ${avgSPPerTicket} SP/ticket suggests patterns we're missing. Adjust next sprint scope target based on actual capacity data`);
    }
    
    if (carriedOverCount > 0 || rejectedCount > 0) {
      actionItems.push(`Establish definition of done checklist based on observed patterns (${rejectedCount} rejections, ${carriedOverCount} carried work) — clarify requirements early to prevent rework`);
    }
    
    if (wentWell.length === 0) wentWell.push("Team maintained consistent delivery patterns throughout the sprint");
    if (needsImprovement.length === 0) needsImprovement.push("Current practices are tracking well — continue building on this momentum. Maintain focus on early blocker surfacing.");
    if (actionItems.length === 0) actionItems.push("Maintain current sprint practices and document what's working — we're aligned and progressing well");
    
    console.log("✅ Using heuristic retrospective (AI not configured)");
    return {
      wentWell: wentWell.slice(0, 3),
      needsImprovement: needsImprovement.slice(0, 3),
      actionItems: actionItems.slice(0, 3),
      closingNote: "We've surfaced key patterns from this sprint. These technical insights and target metrics give us clear direction forward. We're aligned on improving together.",
      attribution: "💡 Generated using heuristic analysis",
    };
  } catch (err) {
    console.error("❌ Retrospective generation error:", err.message);
    return {
      wentWell: ["Unable to generate retrospective insights"],
      needsImprovement: [],
      actionItems: [],
      attribution: "",
    };
  }
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
  html += `<table style="width: 100%; border-collapse: collapse;" border="1"><tbody><tr><td style="width: 30%; padding: 6px 8px;"><strong>Total Tickets:</strong></td><td style="width: 70%; padding: 6px 8px;">${totalCount}</td></tr><tr><td style="width: 30%; padding: 6px 8px;"><strong>Jira Tickets Completed:</strong></td><td style="width: 70%; padding: 6px 8px;">${doneCount} / ${totalCount} (${totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%)</td></tr><tr><td style="width: 30%; padding: 6px 8px;"><strong>Story Points:</strong></td><td style="width: 70%; padding: 6px 8px;">${doneSP} / ${totalSP}</td></tr><tr><td style="width: 30%; padding: 6px 8px;"><strong>Team Members:</strong></td><td style="width: 70%; padding: 6px 8px;">${uniqueAssignees}</td></tr><tr><td style="width: 30%; padding: 6px 8px;"><strong>Generated:</strong></td><td style="width: 70%; padding: 6px 8px;">${timestamp}</td></tr></tbody></table><hr/>`;

  // Group by assignee and build per-person sections
  const groups = groupTicketsByAssignee(tickets);
  
  // Add team contribution summary table
  html += buildPersonSummaryTable(groups, tickets);

  // Sort assignees by story points completed descending, then ticket count as tiebreaker
  const sortedAssignees = Object.keys(groups).sort((a, b) => {
    const spA = groups[a].filter(t => t.status === "Done" || t.status === "Closed").reduce((s, t) => s + (t.sp || 0), 0);
    const spB = groups[b].filter(t => t.status === "Done" || t.status === "Closed").reduce((s, t) => s + (t.sp || 0), 0);
    const doneA = groups[a].filter(t => t.status === "Done" || t.status === "Closed").length;
    const doneB = groups[b].filter(t => t.status === "Done" || t.status === "Closed").length;
    return spB - spA || doneB - doneA;
  });

  for (const assignee of sortedAssignees) {
    html += await buildPersonTable(groups[assignee], assignee, sprintName);
  }

  return html;
}

export async function buildConfluencePage(tickets, sprintName) {
  return await buildConfluencePersonReport(tickets, sprintName);
}

export async function buildRetrospectivePage(tickets, sprintName) {
  // Clear PR cache at the start of each publish run to avoid stale data across sprints
  _prCache.clear();
  const uniqueAssigneesAll = [...new Set(tickets.map(t => t.assigneeName).filter(a => a && a !== "Unassigned"))];
  const token = import.meta.env.VITE_GITHUB_TOKEN;

  // Helper: find the sprint this ticket was deferred to (a future/active sprint beyond the current one)
  const getDeferredSprint = (t) => {
    if (!t.allSprints || t.allSprints.length <= 1) return null;
    return t.allSprints.find(s => s.name !== sprintName && (s.state === "future" || s.state === "active")) ?? null;
  };

  // Build participant data with detailed analysis for AI
  const participantData = await Promise.all(uniqueAssigneesAll.map(async (name) => {
    const myTickets = tickets.filter(t => t.assigneeName === name);
    const completed = myTickets.filter(t => t.status === "Done" || t.status === "Closed");
    const incomplete = myTickets.filter(t => t.status !== "Done" && t.status !== "Closed");
    const deferred = incomplete.filter(t => getDeferredSprint(t) !== null);
    const blocked  = incomplete.filter(t => getDeferredSprint(t) === null);
    
    // Extract detailed data for this person's tickets (for AI analysis - optimized for payload size)
    let detailedContext = null;
    if (token) {
      try {
        const completedDetails = await batchedMap(completed, async t => {
          const detail = {
            id: t.id,
            priority: t.priority,
            type: t.issueType,
            sp: t.sp,
            reviewRating: t.reviewRating,
            tlComment: t.tlComment,
          };
          try {
            if (t.numericId) {
              const prs = await fetchPullRequestsCached(t.numericId);
              detail.mergedPRs = prs ? prs.filter(pr => pr.status === 'MERGED').length : 0;
            }
          } catch { detail.mergedPRs = 0; }
          return detail;
        }, 4);
        
        // Build analysis patterns for this person
        const patterns = {
          highPriorityDelivered: completedDetails.filter(t => t.priority === 'High' || t.priority === 'Highest').length,
          bugsDelivered: completedDetails.filter(t => t.type === 'Bug').length,
          avgReview: completedDetails.filter(t => t.reviewRating !== null).length,
          totalMergedPRs: completedDetails.reduce((sum, t) => sum + (t.mergedPRs || 0), 0),
          highPriorityIncomplete: incomplete.filter(t => t.priority === 'High' || t.priority === 'Highest').length,
          blockedCount: blocked.length,
          deferredCount: deferred.length,
        };
        
        detailedContext = {
          patterns: JSON.stringify(patterns, null, 0),
          tlComments: completedDetails.filter(t => t.tlComment).map(t => `${t.id}: ${t.tlComment}`).slice(0, 3),
          completedCount: completed.length,
          totalCount: myTickets.length,
          qualityMetrics: {
            highPriorityDelivered: completedDetails.filter(t => t.priority === 'High' || t.priority === 'Highest').length,
            reviewedItems: completedDetails.filter(t => t.reviewRating !== null).length,
          },
        };
      } catch (err) {
        console.warn(`Detailed analysis failed for ${name}:`, err.message);
      }
    }
    
    return {
      name,
      completedCount: completed.length,
      totalCount: myTickets.length,
      doneSP: completed.reduce((s, t) => s + (t.sp || 0), 0),
      totalSP: myTickets.reduce((s, t) => s + (t.sp || 0), 0),
      completedTitles: completed.map(t => `${t.id}: ${t.description}`),
      incompleteTitles: blocked.map(t => `${t.id}: ${t.description} [${t.status}]`),
      deferredTitles: deferred.map(t => {
        const dest = getDeferredSprint(t);
        return `${t.id}: ${t.description} [→ ${dest?.name ?? "future sprint"}]`;
      }),
      detailedContext,
    };
  }));

  // Sort participants by story points completed descending, then ticket count as tiebreaker
  participantData.sort((a, b) => b.doneSP - a.doneSP || b.completedCount - a.completedCount);

  // Run both AI calls in parallel
  const [retro, aiParticipantSummaries] = await Promise.all([
    generateSprintRetrospective(tickets, sprintName),
    generateAIParticipantSummaries(participantData, sprintName),
  ]);

  // Sprint metrics for the header info panel
  const totalCount = tickets.length;
  const doneCount = tickets.filter(t => t.status === "Done" || t.status === "Closed").length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const totalSP = tickets.reduce((sum, t) => sum + (t.sp || 0), 0);
  const doneSP = tickets.filter(t => t.status === "Done" || t.status === "Closed").reduce((sum, t) => sum + (t.sp || 0), 0);
  const carriedOver = tickets.filter(t => t.allSprints && t.allSprints.length > 1).length;
  const inProgress = tickets.filter(t => t.status === "In Progress").length;
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  // Use participantData order (already sorted by SP completed) for all rendering
  const uniqueAssignees = participantData.map(p => p.name);

  const listItems = (items) =>
    `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;

  const taskItems = (items) =>
    `<ac:task-list>${items.map((item, idx) =>
      `<ac:task><ac:task-id>${idx + 1}</ac:task-id><ac:task-status>incomplete</ac:task-status><ac:task-body>${escapeHtml(item)}</ac:task-body></ac:task>`
    ).join("")}</ac:task-list>`;

  const panel = (title, borderColor, titleBG, bgColor, body) =>
    `<ac:structured-macro ac:name="panel">` +
    `<ac:parameter ac:name="title">${title}</ac:parameter>` +
    `<ac:parameter ac:name="borderColor">${borderColor}</ac:parameter>` +
    `<ac:parameter ac:name="titleBGColor">${titleBG}</ac:parameter>` +
    `<ac:parameter ac:name="bgColor">${bgColor}</ac:parameter>` +
    `<ac:rich-text-body>${body}</ac:rich-text-body>` +
    `</ac:structured-macro>`;

  let html = "";

  // ── Metadata table ───────────────────────────────────────────────────────────
  html += `<table><tbody>`;
  html += `<tr><td><strong>Date</strong></td><td>${dateStr}</td></tr>`;
  if (uniqueAssignees.length > 0) {
    html += `<tr><td><strong>Participants</strong></td><td>${uniqueAssignees.map(a => `@${escapeHtml(a)}`).join("  ")}</td></tr>`;
  }
  html += `</tbody></table>`;

  // ── Sprint metrics info panel ─────────────────────────────────────────────────
  const metricsBody =
    `<table><tbody>` +
    `<tr><td><strong>Tickets Completed</strong></td><td>${doneCount} / ${totalCount} (${completionPct}%)</td>` +
    `<td><strong>Story Points</strong></td><td>${doneSP} / ${totalSP}</td></tr>` +
    `<tr><td><strong>In Progress</strong></td><td>${inProgress}</td>` +
    `<td><strong>Carried Over</strong></td><td>${carriedOver}</td></tr>` +
    `</tbody></table>`;
  html += panel("📊 Sprint Metrics", "#0052cc", "#e3eeff", "#f5f8ff", metricsBody);

  // ── Per-participant contribution summary ──────────────────────────────────────
  if (uniqueAssignees.length > 0) {
    // Build per-person ticket breakdown
    const ticketLink = (t) =>
      t.jiraUrl
        ? `<a href="${escapeHtml(t.jiraUrl)}">${escapeHtml(t.id)}</a>`
        : escapeHtml(t.id || "");

    const ticketListHtml = (arr) =>
      `<ul>${arr.map(t =>
        `<li>${ticketLink(t)} — ${escapeHtml(t.description || "")}</li>`
      ).join("")}</ul>`;

    const incompleteListHtml = (arr) =>
      `<ul>${arr.map(t => {
        const dest = getDeferredSprint(t);
        const tag = dest
          ? ` <em style="color:#0052cc;">→ ${escapeHtml(dest.name)}</em>`
          : ` <em>[${escapeHtml(t.status)}]</em>`;
        return `<li>${ticketLink(t)} — ${escapeHtml(t.description || "")}${tag}</li>`;
      }).join("")}</ul>`;

    let contribHtml = "";
    for (const name of uniqueAssignees) {
      const p = participantData.find(x => x.name === name);
      const myTickets = tickets.filter(t => t.assigneeName === name);
      const completed = myTickets.filter(t => t.status === "Done" || t.status === "Closed");
      const incomplete = myTickets.filter(t => t.status !== "Done" && t.status !== "Closed");
      const pDoneSP = p.doneSP;
      const pTotalSP = p.totalSP;

      // AI summary or fallback
      const aiSummary = aiParticipantSummaries?.[name];
      const deliveredSummary = aiSummary?.delivered ||
        (completed.length > 0
          ? `Completed ${completed.length} of ${myTickets.length} tickets (${pDoneSP}/${pTotalSP} SP).`
          : `No tickets completed this sprint.`);
      const attentionSummary = aiSummary?.needsAttention ||
        (incomplete.length > 0
          ? `${incomplete.length} ticket(s) need follow-up.`
          : ``);

      const expandTitle = `👤 ${name}  •  ${completed.length}/${myTickets.length} tickets  •  ${pDoneSP}/${pTotalSP} SP`;

      const deliveredBody =
        `<p><strong>${escapeHtml(deliveredSummary)}</strong></p>` +
        (completed.length > 0 ? ticketListHtml(completed) : "");

      const attentionBody = incomplete.length > 0
        ? `<p><strong>${escapeHtml(attentionSummary)}</strong></p>${incompleteListHtml(incomplete)}`
        : `<p><em>✅ All assigned tickets delivered!</em></p>`;

      const innerLayout =
        `<ac:layout><ac:layout-section ac:type="two_equal">` +
        `<ac:layout-cell>${panel("✅ Delivered", "#22a447", "#d4edda", "#f0faf2", deliveredBody)}</ac:layout-cell>` +
        `<ac:layout-cell>${panel("⚠️ Needs Attention", "#d04623", "#fde8e3", "#fff8f7", attentionBody)}</ac:layout-cell>` +
        `</ac:layout-section></ac:layout>`;

      contribHtml +=
        `<ac:structured-macro ac:name="expand">` +
        `<ac:parameter ac:name="title">${escapeHtml(expandTitle)}</ac:parameter>` +
        `<ac:rich-text-body>${innerLayout}</ac:rich-text-body>` +
        `</ac:structured-macro>`;
    }

    html += `<h2>👥 Team Contribution Summary</h2>${contribHtml}`;
  }

  // ── Two-column layout: What Went Well | What Needs Improvement ──────────────
  html += `<ac:layout><ac:layout-section ac:type="two_equal">`;

  html += `<ac:layout-cell>` +
    panel("💚 What Went Well", "#22a447", "#d4edda", "#f0faf2", listItems(retro.wentWell)) +
    `</ac:layout-cell>`;

  html += `<ac:layout-cell>` +
    panel("⚠️ What Needs Improvement", "#d04623", "#fde8e3", "#fff8f7", listItems(retro.needsImprovement)) +
    `</ac:layout-cell>`;

  html += `</ac:layout-section></ac:layout>`;

  // ── Action items panel with task list ────────────────────────────────────────
  html += panel("✅ Action Items", "#0052cc", "#e3eeff", "#f5f8ff", taskItems(retro.actionItems));

  // ── Closing note with alignment and confidence ────────────────────────────────
  if (retro.closingNote) {
    html += `<div style="margin-top: 16px; padding: 12px; border-left: 4px solid #0052cc; background-color: #f5f8ff;">`;
    html += `<p style="margin: 0; font-weight: 500; color: #0052cc;">${escapeHtml(retro.closingNote)}</p>`;
    html += `</div>`;
  }

  // ── Attribution ──────────────────────────────────────────────────────────────
  if (retro.attribution) {
    html += `<p><em><ac:structured-macro ac:name="color"><ac:parameter ac:name="colour">#999999</ac:parameter><ac:rich-text-body>${escapeHtml(retro.attribution)}</ac:rich-text-body></ac:structured-macro></em></p>`;
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
