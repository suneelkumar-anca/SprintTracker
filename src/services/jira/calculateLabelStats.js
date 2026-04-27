/**
 * Calculate statistics for a set of issues including start date, end date, and progress
 * @param {Array} issues - Array of issue objects
 * @returns {Object} Statistics object with startDate, endDate, donePercentage, totalSP, doneSP, issueCount
 */
export function calculateLabelStats(issues = []) {
  if (!issues || issues.length === 0) {
    return {
      startDate: null,
      endDate: null,
      donePercentage: 0,
      totalSP: 0,
      doneSP: 0,
      issueCount: 0,
      doneCount: 0,
      rejectedCount: 0,
      inProgressCount: 0,
      toDoCount: 0,
      blockedCount: 0,
      unassignedCount: 0,
      noSpCount: 0,
      avgReviewRating: null,
    };
  }

  // Calculate start date (earliest created date)
  let startDate = null;
  let lastCreatedDate = null;
  let latestUpdatedDate = null;

  for (const issue of issues) {
    const created = issue.created;
    if (created && (!startDate || created < startDate)) {
      startDate = created;
    }
    if (created && (!lastCreatedDate || created > lastCreatedDate)) {
      lastCreatedDate = created;
    }
    
    const updated = issue.updated;
    if (updated && (!latestUpdatedDate || updated > latestUpdatedDate)) {
      latestUpdatedDate = updated;
    }
  }

  // Calculate end date - use the latest end date from all issues
  let endDate = null;
  let latestEndDate = null;
  
  for (const issue of issues) {
    // Collect the actual end date (not updated date)
    if (issue.endDate) {
      if (!latestEndDate || issue.endDate > latestEndDate) {
        latestEndDate = issue.endDate;
      }
    }
  }
  
  // Use the latest end date if found
  if (latestEndDate) {
    endDate = latestEndDate;
  } else if (latestUpdatedDate) {
    // Fallback to latest updated date
    endDate = latestUpdatedDate;
  } else if (lastCreatedDate) {
    // Final fallback to latest created date
    endDate = lastCreatedDate;
  }

  // Calculate SP totals and status breakdowns
  let totalSP = 0;
  let doneSP = 0;
  let doneCount = 0;
  let rejectedCount = 0;
  let inProgressCount = 0;
  let toDoCount = 0;
  let blockedCount = 0;
  let unassignedCount = 0;
  let noSpCount = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const issue of issues) {
    const sp = Number.isFinite(issue.sp) ? issue.sp : 0;
    totalSP += sp;

    const status = (issue.status ?? "").toLowerCase();
    if (status === "done" || status === "closed") {
      doneSP += sp;
      doneCount++;
    } else if (status === "rejected" || status === "declined") {
      rejectedCount++;
    } else if (status.includes("progress") || status.includes("review") || status.includes("testing") || status.includes("uat")) {
      inProgressCount++;
    } else if (status.includes("blocked") || status.includes("impediment")) {
      blockedCount++;
    } else {
      // "to do", "open", "backlog", "new", anything else
      toDoCount++;
    }

    if (!issue.sp || !Number.isFinite(issue.sp) || issue.sp === 0) noSpCount++;
    if (!issue.assigneeName || issue.assigneeName === "Unassigned") unassignedCount++;

    const rating = issue.reviewRating;
    if (rating != null && Number.isFinite(Number(rating))) {
      ratingSum += Number(rating);
      ratingCount++;
    }
  }

  const avgReviewRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;
  const donePercentage = issues.length > 0 ? Math.round((doneCount / issues.length) * 100) : 0;

  return {
    startDate,
    endDate,
    donePercentage,
    totalSP,
    doneSP,
    issueCount: issues.length,
    doneCount,
    rejectedCount,
    inProgressCount,
    toDoCount,
    blockedCount,
    unassignedCount,
    noSpCount,
    avgReviewRating,
  };
}

/**
 * Format date for display
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date
 */
export function formatDateShort(dateStr) {
  if (!dateStr || dateStr === "Invalid Date") return "–";
  try {
    const date = new Date(dateStr + "T00:00:00Z");
    if (isNaN(date.getTime())) return "–";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "–";
  }
}
