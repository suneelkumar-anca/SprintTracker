/**
 * GitHub Copilot Client
 * Sends prompt to local proxy server (server.js) which calls models.inference.ai.azure.com
 * Proxy is needed because the API blocks browser CORS requests.
 * Returns structured { wentWell, needsImprovement, actionItems } for Confluence macro rendering.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Extracts feedback from Jira comments.
 * Looks for common patterns in comments to categorize as positive or constructive feedback.
 */
function extractFeedbackFromComments(comments) {
  const positive = [];
  const constructive = [];
  
  if (!comments || comments.length === 0) return { positive, constructive };

  const positiveKeywords = ['great', 'excellent', 'good', 'well', 'nice', 'impressive', 'kudos', 'approve', 'ready', 'done', '✓', '+1', 'lgtm'];
  const improvementKeywords = ['issue', 'bug', 'fix', 'need', 'should', 'consider', 'improve', 'refactor', 'optimize', 'slow', 'error', 'fail', 'concern'];

  comments.forEach(c => {
    const body = (c.body || '').toLowerCase();
    const isPositive = positiveKeywords.some(k => body.includes(k));
    const needsWork = improvementKeywords.some(k => body.includes(k));

    if (isPositive && !needsWork) {
      positive.push(c.body);
    } else if (needsWork) {
      constructive.push(c.body);
    }
  });

  return { positive: positive.slice(0, 3), constructive: constructive.slice(0, 3) };
}

export async function generateAIRetrospective(tickets, sprintName, _token, feedbackContext = null) {
  if (!tickets || tickets.length === 0) return null;

  try {
    const totalCount = tickets.length;
    const doneCount = tickets.filter(
      (t) => t.status === 'Done' || t.status === 'Closed'
    ).length;
    const completionPct =
      totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const totalSP = tickets.reduce((sum, t) => sum + (t.sp || 0), 0);
    const doneSP = tickets
      .filter((t) => t.status === 'Done' || t.status === 'Closed')
      .reduce((sum, t) => sum + (t.sp || 0), 0);

    const statusCounts = {};
    tickets.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    const carriedOverCount = tickets.filter(
      (t) => t.allSprints && t.allSprints.length > 1
    ).length;

    // Build context section from comprehensive ticket and PR data
    let contextSection = '';
    if (feedbackContext) {
      if (feedbackContext.detailedTickets) {
        contextSection += `\n\nDETAILED TICKET DATA (Sample):\n${feedbackContext.detailedTickets}`;
      }
      if (feedbackContext.patterns) {
        contextSection += `\n\nSPRINT PATTERNS:\n${feedbackContext.patterns}`;
      }
      if (feedbackContext.tlComments && feedbackContext.tlComments.length > 0) {
        contextSection += `\n\nTEAM LEAD COMMENTS:\n${feedbackContext.tlComments.map(c => `- ${c}`).join('\n')}`;
      }
      if (feedbackContext.reviewInsights && feedbackContext.reviewInsights.length > 0) {
        contextSection += `\n\nQUALITY REVIEWS:\n${feedbackContext.reviewInsights.map(r => `- ${r}`).join('\n')}`;
      }
      if (feedbackContext.issues && feedbackContext.issues.length > 0) {
        contextSection += `\n\nBUGS/ISSUES IDENTIFIED:\n${feedbackContext.issues.map(i => `- ${i}`).join('\n')}`;
      }
    }

    const prompt = `You are a senior engineering lead and agile coach writing a sprint retrospective. Your role combines deep technical analysis with the communication discipline of a trusted leader.

Your retrospective must be grounded entirely in the ACTUAL sprint data provided. Every insight, number, and observation must come from that data.

ANALYSE THESE DIMENSIONS from the provided data:
- PR quality and flow: open PRs, review depth, merge patterns, dependency chains
- Code quality: bug count, bug types, area-specific issues, review thoroughness
- Technical debt: estimation accuracy, deferred tickets, complexity patterns, rework
- Blockers and dependencies: blocked items, cascade effects, external constraints
- Delivery health: completion rate, story point accuracy, carry-over volume, scope changes

COMMUNICATION PRINCIPLES — apply all of these in your writing:

1. ACKNOWLEDGE REALITY BEFORE REFRAMING — Name issues clearly and honestly first. Do not jump straight to positivity. Earn the reframe by acknowledging the reality, then redirect forward constructively.

2. SEPARATE PEOPLE FROM THE PROBLEM — Never frame anything as a personal failure. Focus on systems, patterns, and constraints. "The deadline wasn't met — here's what the data shows got in the way."

3. CALM, NEUTRAL LANGUAGE — Never use: "disaster", "failure", "unacceptable", "poor". Use: "gap", "constraint", "opportunity", "pattern", "throughput issue".

4. SHOW ALIGNMENT, NOT AUTHORITY — Write as someone working with the team. "We need to address this together" not "the team must improve".

5. REDIRECT FROM BLAME TO SOLUTION — State the issue clearly, then move quickly to the practical action. Don't dwell in the problem.

6. BE TRANSPARENT, NOT ALARMING — Name real risks and gaps clearly. Pair every concern with what can be done about it. Clarity plus direction equals confidence.

7. GIVE OWNERSHIP WITHOUT PRESSURE — Action items should feel enabling, not cornering. "Surface blockers in planning" not "fix your estimation habits".

8. VALIDATE EFFORT EVEN WHEN OUTCOMES FELL SHORT — Acknowledge the work done before driving improvement. "The team pushed through real constraints — let's refine the approach for next sprint."

9. USE FUTURE-FOCUSED FRAMING — Look forward. "What do we adjust next sprint" not "what went wrong". Shift the reader from guilt to growth.

10. CLOSE WITH CLARITY AND REASSURANCE — End with direction and confidence. People should feel guided and aligned, not shaken.

AVOID: forced positivity, vague instructions, ignoring concerns, letting emotions dictate tone, public criticism.

DATA RULES — non-negotiable:
- Use ONLY real values from the data: real ticket IDs, real counts, real percentages, real status names.
- NEVER write placeholder text like "X tickets", "Y days", "Z%", "N items", or "e.g." in your output.
- Each array item must be ONE distinct, complete sentence. Do not bundle multiple points into one string.
- Do NOT prefix items with labels like "PRIMARY:", "SECONDARY:", "METRIC:", "INSIGHT 1:", etc.
- Do NOT use markdown code fences. Return raw JSON only.

SPRINT: "${sprintName}"

ACTUAL SPRINT DATA:
${contextSection}

SPRINT METRICS:
- Total tickets: ${totalCount} | Completed: ${doneCount} (${completionPct}%) | Story points: ${doneSP}/${totalSP} (${totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0}%)
- In Progress: ${statusCounts['In Progress'] || 0} | To Do: ${statusCounts['To Do'] || 0} | Rejected: ${(statusCounts['Rejected'] || 0) + (statusCounts['Declined'] || 0)} | Carried-over: ${carriedOverCount}

Return ONLY valid raw JSON (no code fences). Arrays must contain 3 to 5 plain sentences each:
{
  "wentWell": [],
  "needsImprovement": [],
  "actionItems": [],
  "closingNote": ""
}`;

    const response = await fetch(`${BACKEND_URL}/api/retrospective`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Backend error ${response.status}`);
    }

    const { retrospective } = await response.json();
    if (!retrospective) return null;

    // Strip markdown code fences if the model wrapped the response
    const cleaned = retrospective.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(cleaned);
    if (!parsed.wentWell || !parsed.needsImprovement || !parsed.actionItems) return null;

    console.log('✅ AI retrospective generated with constructive communication principles');
    return {
      wentWell: parsed.wentWell,
      needsImprovement: parsed.needsImprovement,
      actionItems: parsed.actionItems,
      closingNote: parsed.closingNote || null,
      attribution: '✨ Generated using GitHub Copilot AI',
    };
  } catch (err) {
    console.error('❌ AI retrospective generation failed:', err.message);
    return null;
  }
}

/**
 * Generates 1-2 line AI summaries for each participant in a single request.
 * @param {Array<{name: string, completedCount: number, totalCount: number, doneSP: number, totalSP: number, completedTitles: string[], incompleteTitles: string[], detailedContext?: object}>} participants
 * @param {string} sprintName
 * @returns {Promise<Record<string, {delivered: string, needsAttention: string}> | null>}
 */
export async function generateAIParticipantSummaries(participants, sprintName) {
  if (!participants || participants.length === 0) return null;

  try {
    const participantData = participants.map(p => {
      const base = {
        name: p.name,
        completedCount: p.completedCount,
        totalCount: p.totalCount,
        doneSP: p.doneSP,
        totalSP: p.totalSP,
        completedTickets: p.completedTitles.slice(0, 8),
        incompleteTickets: p.incompleteTitles.slice(0, 5),
        deferredToFutureSprint: (p.deferredTitles ?? []).slice(0, 5),
      };
      // Include detailed context if available
      if (p.detailedContext) {
        base.detailedContext = p.detailedContext;
      }
      return base;
    });

    // Build context sections from detailed data (optimized to reduce payload size)
    let contextSections = '';
    for (const p of participantData) {
      if (p.detailedContext) {
        contextSections += `\n\n=== ${p.name} ===\nDelivered: ${p.detailedContext.completedCount}/${p.detailedContext.totalCount} tickets`;
        // Include technical quality metrics
        if (p.detailedContext.qualityMetrics) {
          const metrics = p.detailedContext.qualityMetrics;
          contextSections += `\nQUALITY: ${metrics.highPriorityDelivered} high-priority, ${metrics.reviewedItems} reviewed`;
        }
        if (p.detailedContext.patterns) {
          contextSections += `\nPATTERNS:\n${p.detailedContext.patterns}`;
        }
        if (p.detailedContext.tlComments && p.detailedContext.tlComments.length > 0) {
          contextSections += `\nFEEDBACK:\n${p.detailedContext.tlComments.map(c => `• ${c}`).join('\n')}`;
        }
      }
    }

    const prompt = `You are a senior engineering lead writing individual sprint summaries for each team member. You combine honest technical analysis with the communication discipline of a trusted manager.

Your summaries must be grounded entirely in the ACTUAL data provided for each person. Every number, observation, and pattern must come from that data.

ANALYSE PER PERSON from the data:
- Completed work: real ticket count, story points, ticket types, priority levels
- Quality indicators: PR review patterns, code review depth visible in the data
- Collaboration signals: dependency handling, blocker patterns
- Constraints: what the data shows caused incomplete or deferred work

COMMUNICATION PRINCIPLES — apply all of these:

1. ACKNOWLEDGE REALITY BEFORE REFRAMING — If work is incomplete, name it clearly and honestly first. Do not skip to optimism. Then frame what comes next.

2. SEPARATE PERSON FROM PROBLEM — Never make a summary sound like a personal judgment. Focus on patterns, constraints, and systems. "3 items remained open due to a late dependency" not "they didn't finish".

3. CALM, NEUTRAL LANGUAGE — Never use: "failed", "missed", "poor", "behind", "underperformed". Use: "constraint", "gap", "pattern", "deferred", "in progress".

4. SHOW ALIGNMENT — Write as a colleague, not a critic. The tone should feel like a manager speaking with the person, not about them.

5. VALIDATE EFFORT EVEN WHEN OUTCOMES FELL SHORT — Acknowledge the real work done before noting what's incomplete. Delivered work first, gaps second.

6. BE TRANSPARENT, NOT ALARMING — State the real numbers. Don't downplay gaps, but don't catastrophise either. Pair every gap with context or cause.

7. FUTURE-FOCUSED FRAMING — Frame incomplete work as something to carry forward productively, not a failure to relitigate.

8. GIVE OWNERSHIP WITHOUT PRESSURE — If there's a follow-up, frame it as enabling: "picking up the remaining items next sprint" not "needs to catch up".

9. CLOSE WITH REASSURANCE — Each summary should convey direction and confidence, not ambiguity or judgment.

10. NO FORCED POSITIVITY — Do not say everything went well if the data shows otherwise. Honest and constructive beats cheerful and hollow.

DATA RULES — non-negotiable:
- Use ONLY real values from the data: real names, real ticket counts, real story points.
- NEVER write placeholder text like "X tickets", "Y story points", "Z items", or "e.g." in your output.
- Do NOT prefix values with labels like "PRIMARY:", "SECONDARY:", "TECHNICAL DETAIL:", etc.
- Do NOT use markdown code fences. Return raw JSON only.

SPRINT: "${sprintName}"

ACTUAL TEAM DATA:
${JSON.stringify(participantData, null, 0)}
${contextSections ? `\n\nDETAILED CONTEXT PER PERSON:${contextSections}` : ''}

Return ONLY valid raw JSON (no code fences), using each person's exact name as the key:
{
  "<exact name from data>": {
    "delivered": "One to two plain sentences grounded in their real data — what they completed, the quality and priority level of that work",
    "needsAttention": "If incomplete: one to two plain sentences naming the gap and its systemic cause using real numbers. Empty string if fully complete."
  }
}`;

    const response = await fetch(`${BACKEND_URL}/api/retrospective`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Backend error ${response.status}`);
    }

    const { retrospective } = await response.json();
    if (!retrospective) return null;

    // Strip markdown code fences if the model wrapped the response
    const cleaned = retrospective.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(cleaned);
    console.log('✅ AI participant summaries generated with constructive communication principles');
    return parsed;
  } catch (err) {
    console.error('❌ AI participant summaries generation failed:', err.message);
    return null;
  }
}

/**
 * Generates an AI-driven executive milestone status summary for Confluence.
 * Persona: principal program manager, 30+ years experience, writing for executive stakeholders.
 * Uses the same /api/retrospective proxy endpoint — the model is generic.
 *
 * @param {Array} tickets - Mapped issue objects
 * @param {string} milestoneName - Display name of the milestone
 * @returns {Promise<{executiveSummary: string, riskLevel: string, keyRisks: string[], recommendations: string[], closingNote: string} | null>}
 */
export async function generateAIMilestoneSummary(tickets, milestoneName) {
  if (!tickets || tickets.length === 0) return null;

  const totalCount = tickets.length;
  const isDone = t => { const s = (t.status ?? '').toLowerCase(); return s === 'done' || s === 'closed'; };
  const isRejected = t => { const s = (t.status ?? '').toLowerCase(); return s === 'rejected' || s === 'declined'; };
  const isBlocked = t => { const s = (t.status ?? '').toLowerCase(); return s.includes('blocked') || s.includes('impediment'); };
  const isInProgress = t => { const s = (t.status ?? '').toLowerCase(); return s.includes('progress') || s.includes('review') || s.includes('testing') || s.includes('uat') || s.includes('feedback'); };

    const doneCount = tickets.filter(isDone).length;
    const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const totalSP = tickets.reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0);
    const doneSP = tickets.filter(isDone).reduce((sum, t) => sum + (Number.isFinite(t.sp) ? t.sp : 0), 0);
    const rejectedCount = tickets.filter(isRejected).length;
    const blockedCount = tickets.filter(isBlocked).length;
    const inProgressCount = tickets.filter(isInProgress).length;
    const unassignedCount = tickets.filter(t => !t.assigneeName || t.assigneeName === 'Unassigned').length;
    const noSpCount = tickets.filter(t => !t.sp || !Number.isFinite(t.sp) || t.sp === 0).length;

    const ratings = tickets.map(t => t.reviewRating).filter(r => r != null && Number.isFinite(Number(r)));
    const avgRating = ratings.length > 0
      ? (Math.round((ratings.reduce((s, r) => s + Number(r), 0) / ratings.length) * 10) / 10) : null;

    // Status breakdown
    const statusCounts = {};
    tickets.forEach(t => { statusCounts[t.status ?? 'Unknown'] = (statusCounts[t.status ?? 'Unknown'] || 0) + 1; });

    // Priority distribution
    const priorityCounts = {};
    tickets.forEach(t => { priorityCounts[t.priority ?? 'Unknown'] = (priorityCounts[t.priority ?? 'Unknown'] || 0) + 1; });

    // Issue type distribution
    const typeCounts = {};
    tickets.forEach(t => { typeCounts[t.issueType ?? 'Unknown'] = (typeCounts[t.issueType ?? 'Unknown'] || 0) + 1; });

    // Per-assignee load and delivery analysis
    const assigneeMap = {};
    tickets.forEach(t => {
      const name = t.assigneeName || 'Unassigned';
      if (!assigneeMap[name]) assigneeMap[name] = { total: 0, done: 0, rejected: 0, blocked: 0, inProgress: 0, totalSP: 0, doneSP: 0, highPriority: 0 };
      assigneeMap[name].total++;
      assigneeMap[name].totalSP += Number.isFinite(t.sp) ? t.sp : 0;
      if (isDone(t)) { assigneeMap[name].done++; assigneeMap[name].doneSP += Number.isFinite(t.sp) ? t.sp : 0; }
      if (isRejected(t)) assigneeMap[name].rejected++;
      if (isBlocked(t)) assigneeMap[name].blocked++;
      if (isInProgress(t)) assigneeMap[name].inProgress++;
      if (t.priority === 'High' || t.priority === 'Highest') assigneeMap[name].highPriority++;
    });
    const assigneeStats = Object.entries(assigneeMap).map(([name, s]) => ({
      name,
      total: s.total,
      done: s.done,
      donePct: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
      rejected: s.rejected,
      blocked: s.blocked,
      inProgress: s.inProgress,
      totalSP: s.totalSP,
      doneSP: s.doneSP,
      highPriority: s.highPriority,
    })).sort((a, b) => b.total - a.total);

    // TL comments sample (up to 10)
    const tlComments = tickets.filter(t => t.tlComment).slice(0, 10).map(t => `[${t.id}] ${t.tlComment}`);

    // Identified risks: tickets with no SP, high priority not done, blocked, rejected
    const highPriorityNotDone = tickets.filter(t => !isDone(t) && (t.priority === 'High' || t.priority === 'Highest'));
    const noSpTickets = tickets.filter(t => !t.sp || !Number.isFinite(t.sp) || t.sp === 0);
    const rejectedTickets = tickets.filter(isRejected);
    const blockedTickets = tickets.filter(isBlocked);

    // All tickets for full data (capped at 80 to stay within token budget, prioritising unfinished/risky)
    const scoredTickets = tickets.map(t => ({
      t,
      score: (isRejected(t) ? 4 : 0) + (isBlocked(t) ? 4 : 0) +
             (!isDone(t) && (t.priority === 'High' || t.priority === 'Highest') ? 3 : 0) +
             (t.tlComment ? 2 : 0) + (t.reviewRating != null ? 1 : 0) +
             (!isDone(t) ? 1 : 0),
    }));
    scoredTickets.sort((a, b) => b.score - a.score);
    const fullTicketData = scoredTickets.slice(0, 80).map(({ t }) => ({
      id: t.id,
      status: t.status,
      priority: t.priority,
      type: t.issueType,
      sp: t.sp ?? null,
      assignee: t.assigneeName || 'Unassigned',
      summary: (t.description ?? '').slice(0, 100),
      tlComment: t.tlComment ?? null,
      reviewRating: t.reviewRating ?? null,
      created: t.created ? t.created.slice(0, 10) : null,
      labels: (t.labels ?? []).join(', ') || null,
      components: (t.components ?? []).join(', ') || null,
    }));

    const prompt = `You are a senior program director and delivery executive with 50+ years of hands-on project and portfolio management experience across enterprise, product, and engineering organizations. You have seen every pattern of delivery risk, scope drift, team imbalance, and quality failure that exists. Your analysis is the gold standard that executive stakeholders and delivery boards rely on.

Your role here is to analyze this milestone in full depth — not just surface metrics. You must:
- Identify systemic risks, not just symptom counts
- Assess workload distribution and team balance
- Evaluate quality signals from review ratings and TL comments
- Spot priority misalignment and scope risk
- Identify gaps in estimation or execution discipline
- Provide concrete, sequenced remediation recommendations a delivery team can act on immediately
- Ground every observation in the ACTUAL data. No invented patterns. No generalities.

COMMUNICATION PRINCIPLES:
1. Executive-grade clarity — direct, confident, and data-grounded.
2. Pair every risk with its downstream impact if unaddressed.
3. Acknowledge strengths before surfacing risks — do not lead with doom.
4. Recommendations must be prioritized and sequenced (most critical first).
5. Use calm, professional language. Not alarming, but never dismissive.
6. If a pattern in the data suggests a deeper organizational or process gap, name it directly.

DATA RULES — non-negotiable:
- Use ONLY real values from the data below. Real names, real counts, real percentages.
- NEVER write "X tickets", "Y%", "[number]", "N items", or "e.g." in your output.
- Do NOT use markdown code fences. Return raw JSON only.
- Each string in arrays must be ONE complete, standalone sentence.
- Do NOT prefix items with labels like "RISK 1:", "ACTION:", "PRIMARY:" etc.

MILESTONE: "${milestoneName}"

CORE METRICS:
- Total issues: ${totalCount} | Done: ${doneCount} (${completionPct}%) | In Progress: ${inProgressCount}
- Story Points: ${doneSP}/${totalSP} (${totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0}%)
- Rejected/Declined: ${rejectedCount} | Blocked: ${blockedCount}
- Unassigned issues: ${unassignedCount} | Issues without SP estimate: ${noSpCount}
${avgRating != null ? `- Avg review rating: ${avgRating}/5 (from ${ratings.length} rated tickets)` : '- No review ratings recorded'}

STATUS DISTRIBUTION:
${Object.entries(statusCounts).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

PRIORITY DISTRIBUTION:
${Object.entries(priorityCounts).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

ISSUE TYPE DISTRIBUTION:
${Object.entries(typeCounts).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

TEAM LOAD & DELIVERY BY ASSIGNEE:
${assigneeStats.map(a => `  ${a.name}: ${a.done}/${a.total} done (${a.donePct}%) | ${a.doneSP}/${a.totalSP} SP | ${a.inProgress} in-progress | ${a.rejected} rejected | ${a.blocked} blocked | ${a.highPriority} high-priority`).join('\n')}

HIGH PRIORITY NOT DONE (${highPriorityNotDone.length}):
${highPriorityNotDone.slice(0, 15).map(t => `  [${t.id}] ${t.status} | ${t.priority} | ${t.assigneeName || 'Unassigned'} | ${(t.description ?? '').slice(0, 80)}`).join('\n') || '  None'}

BLOCKED TICKETS (${blockedTickets.length}):
${blockedTickets.slice(0, 10).map(t => `  [${t.id}] ${t.status} | ${t.assigneeName || 'Unassigned'} | ${(t.description ?? '').slice(0, 80)}`).join('\n') || '  None'}

REJECTED/DECLINED TICKETS (${rejectedTickets.length}):
${rejectedTickets.slice(0, 10).map(t => `  [${t.id}] ${t.assigneeName || 'Unassigned'} | ${(t.description ?? '').slice(0, 80)}`).join('\n') || '  None'}

UNESTIMATED TICKETS — NO STORY POINTS (${noSpTickets.length}):
${noSpTickets.slice(0, 10).map(t => `  [${t.id}] ${t.status} | ${t.priority} | ${(t.description ?? '').slice(0, 60)}`).join('\n') || '  None'}

${tlComments.length > 0 ? `TL COMMENTS / QUALITY FEEDBACK:\n${tlComments.map(c => `  ${c}`).join('\n')}\n` : ''}
FULL TICKET DATA (${fullTicketData.length} highest-priority tickets):
${JSON.stringify(fullTicketData, null, 0)}

Riskevel rules: "Green" = completion >= 80%, "Amber" = 50–79%, "Red" = below 50% OR any blocked/rejected count > 10% of total.

Return ONLY valid raw JSON (no code fences):
{
  "executiveSummary": "2-3 sentence executive paragraph: current delivery status, confidence level, and overall health.",
  "riskLevel": "Green" | "Amber" | "Red",
  "keyRisks": ["4-6 sentences, each a distinct risk grounded in the data with downstream impact if unaddressed"],
  "recommendations": ["4-6 sentences, each a concrete, sequenced, actionable next step — most critical first"],
  "teamAnalysis": "2-3 sentences assessing team load distribution, delivery spread, and any imbalance or concentration risk visible in the data.",
  "qualityAssessment": "2-3 sentences on quality signals: review ratings, rejection rate, TL feedback patterns, and what they indicate about delivery discipline.",
  "scopeAndEstimationHealth": "1-2 sentences on estimation completeness (unestimated tickets), scope definition quality, and any gaps that create planning risk.",
  "closingNote": "1 forward-looking sentence calibrated to the riskLevel — directional and confidence-appropriate for executive readers."
}`;

    // Retry up to 3 times with exponential backoff
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15 minutes
        let response;
        try {
          response = await fetch(`${BACKEND_URL}/api/retrospective`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Backend error ${response.status}`);
        }

        const body = await response.json();
        const raw = body.retrospective ?? body.result ?? body.content ?? null;
        if (!raw) throw new Error('Empty response from AI backend');

        // Strip markdown code fences; extract first {...} block if model prepended prose
        const cleaned = raw.trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/, '')
          .replace(/^[^{]*([\s\S]*\{[\s\S]*\})[\s\S]*$/, '$1');

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch (parseErr) {
          throw new Error(`JSON parse failed (attempt ${attempt}): ${parseErr.message}`);
        }

        // Validate required fields — build safe fallbacks rather than dropping the section
        const riskLevel = ['Green', 'Amber', 'Red'].includes(parsed.riskLevel)
          ? parsed.riskLevel
          : completionPct >= 80 ? 'Green' : completionPct >= 50 ? 'Amber' : 'Red';

        const executiveSummary = typeof parsed.executiveSummary === 'string' && parsed.executiveSummary.trim()
          ? parsed.executiveSummary
          : `Milestone "${milestoneName}" is ${completionPct}% complete (${doneCount}/${totalCount} tickets, ${doneSP}/${totalSP} SP). Risk level: ${riskLevel}.`;

        const ensureArray = (v) => Array.isArray(v) && v.length > 0 ? v : null;

        console.log(`✅ AI milestone summary generated (attempt ${attempt})`);
        return {
          executiveSummary,
          riskLevel,
          keyRisks:                 ensureArray(parsed.keyRisks) ?? [],
          recommendations:          ensureArray(parsed.recommendations) ?? [],
          teamAnalysis:             parsed.teamAnalysis ?? null,
          qualityAssessment:        parsed.qualityAssessment ?? null,
          scopeAndEstimationHealth: parsed.scopeAndEstimationHealth ?? null,
          closingNote:              parsed.closingNote ?? '',
        };
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ AI milestone summary attempt ${attempt}/3 failed: ${err.message}`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1500));
        }
      }
    }

    // All retries exhausted — return a data-driven fallback so the section always appears
    console.error('❌ AI milestone summary failed after 3 attempts:', lastError?.message);
    const riskLevelFallback = completionPct >= 80 ? 'Green' : completionPct >= 50 ? 'Amber' : 'Red';
    return {
      executiveSummary: `Milestone "${milestoneName}" is ${completionPct}% complete with ${doneCount} of ${totalCount} tickets delivered (${doneSP}/${totalSP} SP).${rejectedCount > 0 ? ` ${rejectedCount} ticket${rejectedCount > 1 ? 's' : ''} rejected.` : ''}${blockedCount > 0 ? ` ${blockedCount} ticket${blockedCount > 1 ? 's' : ''} currently blocked.` : ''}`,
      riskLevel: riskLevelFallback,
      keyRisks: [
        ...(blockedCount > 0 ? [`${blockedCount} ticket${blockedCount > 1 ? 's are' : ' is'} blocked and may delay delivery.`] : []),
        ...(rejectedCount > 0 ? [`${rejectedCount} ticket${rejectedCount > 1 ? 's' : ''} rejected — rework may impact timeline.`] : []),
        ...(noSpCount > 0 ? [`${noSpCount} ticket${noSpCount > 1 ? 's have' : ' has'} no story point estimate, creating planning risk.`] : []),
        ...(highPriorityNotDone.length > 0 ? [`${highPriorityNotDone.length} high-priority ticket${highPriorityNotDone.length > 1 ? 's' : ''} not yet completed.`] : []),
      ],
      recommendations: [
        ...(blockedCount > 0 ? ['Escalate blocked tickets immediately to remove impediments.'] : []),
        ...(noSpCount > 0 ? ['Ensure all open tickets are estimated before the next planning cycle.'] : []),
        ...(highPriorityNotDone.length > 0 ? ['Prioritise high-priority incomplete items in the next sprint.'] : []),
      ],
      teamAnalysis: null,
      qualityAssessment: null,
      scopeAndEstimationHealth: null,
      closingNote: '(AI narrative unavailable — metrics computed directly from Jira data)',
    };
}