import { useCallback, useState } from "react";
import { publishMilestonePage } from "../services/confluence/index.js";
import { exportToExcel } from "../services/excel/index.js";

export function useMilestoneActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const publishMilestone = useCallback(async (milestone) => {
    if (!milestone) return { success: false, error: "No milestone provided" };
    setLoading(true);
    setError("");
    try {
      const result = await publishMilestonePage(milestone.tickets, milestone.name, milestone.deadlineDate, milestone.reviewDate);
      if (result.success) {
        console.log("Milestone published:", result.message);
        if (result.pageUrl) window.open(result.pageUrl, "_blank");
      } else {
        setError(result.error || "Failed to publish milestone");
      }
      return result;
    } catch (err) {
      const msg = err.message || "Failed to publish milestone";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const exportMilestone = useCallback(async (milestone) => {
    if (!milestone) return { success: false, error: "No milestone provided" };
    setLoading(true);
    setError("");
    try {
      await exportToExcel(milestone.tickets, `${milestone.name} - ${new Date().toISOString().split("T")[0]}`);
      return { success: true };
    } catch (err) {
      const msg = err.message || "Failed to export milestone";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { publishMilestone, exportMilestone, loading, error };
}
