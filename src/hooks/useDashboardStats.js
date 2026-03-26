import { useMemo } from "react";
import { fmtFull } from "../utils/dateUtils.js";

export function useDashboardStats(sprintTickets, sprint) {
  return useMemo(() => {
    const totalTickets = sprintTickets.length;
    const doneCount    = sprintTickets.filter(t => (t.status ?? "").toLowerCase() === "done").length;
    const totalSP      = sprintTickets.reduce((s, t) => s + (Number.isFinite(t.sp) ? t.sp : 0), 0);

    const peopleMap = {};
    for (const t of sprintTickets) {
      const name = t.assigneeName ?? "Unassigned";
      if (!peopleMap[name]) {
        peopleMap[name] = { name, avatar: t.assigneeAvatar, tickets: [], totalSP: 0, doneSP: 0, statusCounts: {} };
      }
      peopleMap[name].tickets.push(t);
      const sp = Number.isFinite(t.sp) ? t.sp : 0;
      peopleMap[name].totalSP += sp;
      if ((t.status ?? "").toLowerCase() === "done") peopleMap[name].doneSP += sp;
      peopleMap[name].statusCounts[t.status ?? "Unknown"] = (peopleMap[name].statusCounts[t.status ?? "Unknown"] ?? 0) + 1;
    }
    const people = Object.values(peopleMap).sort((a, b) => b.tickets.length - a.tickets.length);

    const sprintStart = sprint?.startDate ? fmtFull(sprint.startDate) : null;
    const sprintEnd   = sprint?.endDate   ? fmtFull(sprint.endDate)   : null;
    const sprintState = sprint?.state ?? null;
    const today = new Date();
    let daysLeft = null, daysOverdue = null, progressPct = 0;
    if (sprint?.startDate && sprint?.endDate) {
      const start = new Date(sprint.startDate), end = new Date(sprint.endDate);
      const totalDays = Math.max(1, Math.round((end - start) / 86400000));
      progressPct = Math.min(100, Math.max(0, Math.round(((today - start) / 86400000 / totalDays) * 100)));
      if (today > end) daysOverdue = Math.round((today - end) / 86400000);
      else daysLeft = Math.max(0, Math.round((end - today) / 86400000));
    }

    return { people, totalTickets, doneCount, totalSP, progressPct, daysLeft, daysOverdue, sprintStart, sprintEnd, sprintState };
  }, [sprintTickets, sprint]);
}
