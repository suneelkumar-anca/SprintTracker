import { useState, useMemo, useCallback } from "react";

export function useFilters(sprintTickets) {
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterStart,    setFilterStart]    = useState("");
  const [filterEnd,      setFilterEnd]      = useState("");

  const uniqueAssignees = useMemo(
    () => [...new Set(sprintTickets.map((t) => t.assigneeName).filter(Boolean))].sort(),
    [sprintTickets]
  );
  const uniqueStatuses = useMemo(
    () => [...new Set(sprintTickets.map((t) => t.status).filter(Boolean))].sort(),
    [sprintTickets]
  );

  const filteredTickets = useMemo(() =>
    sprintTickets.filter((t) => {
      if (filterAssignee && t.assigneeName !== filterAssignee) return false;
      if (filterStatus && (t.status ?? "").toLowerCase() !== filterStatus.toLowerCase()) return false;
      if (filterStart && (!t.created || t.created < filterStart)) return false;
      if (filterEnd   && (!t.created || t.created > filterEnd))   return false;
      return true;
    }),
    [sprintTickets, filterAssignee, filterStatus, filterStart, filterEnd]
  );

  const hasActiveFilters = !!(filterAssignee || filterStatus || filterStart || filterEnd);

  const clearFilters = useCallback(() => {
    setFilterAssignee(""); setFilterStatus(""); setFilterStart(""); setFilterEnd("");
  }, []);

  return {
    filteredTickets, uniqueAssignees, uniqueStatuses, hasActiveFilters,
    filterAssignee, setFilterAssignee, filterStatus, setFilterStatus,
    filterStart, setFilterStart, filterEnd, setFilterEnd, clearFilters,
  };
}
