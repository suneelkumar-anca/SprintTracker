import { useMemo } from "react";

export function useMilestones(sprintTickets = []) {
  return useMemo(() => {
    const milestoneMap = {};
    const today = new Date();

    for (const t of sprintTickets) {
      const name = t.milestone ?? "Unassigned";
      if (!milestoneMap[name]) {
        milestoneMap[name] = {
          name,
          tickets: [],
          totalCount: 0,
          doneCount: 0,
          totalSP: 0,
          doneSP: 0,
          deadlineDate: null,
          statusCounts: {},
        };
      }

      milestoneMap[name].tickets.push(t);
      milestoneMap[name].totalCount += 1;
      if ((t.status ?? "").toLowerCase() === "done") milestoneMap[name].doneCount += 1;

      const sp = Number.isFinite(t.sp) ? t.sp : 0;
      milestoneMap[name].totalSP += sp;
      if ((t.status ?? "").toLowerCase() === "done") milestoneMap[name].doneSP += sp;

      milestoneMap[name].statusCounts[t.status ?? "Unknown"] = (milestoneMap[name].statusCounts[t.status ?? "Unknown"] ?? 0) + 1;

      if (t.endDate && (!milestoneMap[name].deadlineDate || t.endDate > milestoneMap[name].deadlineDate)) {
        milestoneMap[name].deadlineDate = t.endDate;
      }
    }

    const allMilestones = Object.values(milestoneMap)
      .map((m) => {
        let daysLeft = null, daysOverdue = null;
        if (m.deadlineDate) {
          const deadline = new Date(m.deadlineDate);
          if (today > deadline) daysOverdue = Math.round((today - deadline) / 86400000);
          else daysLeft = Math.max(0, Math.round((deadline - today) / 86400000));
        }
        const completionPct = m.totalCount > 0 ? Math.round((m.doneCount / m.totalCount) * 100) : 0;
        return { ...m, daysLeft, daysOverdue, completionPct };
      })
      .sort((a, b) => {
        if (a.deadlineDate && b.deadlineDate) return a.deadlineDate.localeCompare(b.deadlineDate);
        if (a.deadlineDate) return -1;
        if (b.deadlineDate) return 1;
        return 0;
      });

    return { milestoneMap, allMilestones, loading: false };
  }, [sprintTickets]);
}
