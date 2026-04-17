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
  
