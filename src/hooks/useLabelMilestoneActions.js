import { useCallback, useState } from "react";
import { publishMilestonePage } from "../services/confluence/index.js";
import { exportToExcel } from "../services/excel/index.js";

export function useLabelMilestoneActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const publishMilestoneFromLabels = useCallback(async (issues, labels, boardName = null) => {
    if (!issues || issues.length === 0) {
      return { success: false, error: "No issues selected" };
    }

    setLoading(true);
    setError("");

    try {
      const milestoneName = `${boardName || "Team"} - ${labels.join(", ")}`;

      // Derive deadline from the latest endDate across all issues
      const deadlineDate = issues.reduce((latest, issue) => {
        if (!issue.endDate) return latest;
        return (!latest || issue.endDate > latest) ? issue.endDate : latest;
      }, null);

      const result = await publishMilestonePage(issues, milestoneName, deadlineDate, null);

      if (result.success) {
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

  const exportMilestoneFromLabels = useCallback(async (issues, labels, boardName = null) => {
    if (!issues || issues.length === 0) {
      return { success: false, error: "No issues selected" };
    }

    setLoading(true);
    setError("");

    try {
      // Debug: check story points in issues
      const spStats = {
        total: issues.length,
        withSP: issues.filter(i => Number.isFinite(i.sp) && i.sp > 0).length,
        totalSP: issues.reduce((sum, i) => sum + (Number.isFinite(i.sp) ? i.sp : 0), 0),
      };
      console.debug("Exporting milestone with SP stats:", spStats);
      
      const fileName = `${boardName || "Team"} - ${labels.join(", ")} - ${new Date().toISOString().split("T")[0]}`;
      await exportToExcel(issues, fileName);
      return { success: true };
    } catch (err) {
      const msg = err.message || "Failed to export milestone";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    publishMilestoneFromLabels,
    exportMilestoneFromLabels,
    loading,
    error,
  };
}
