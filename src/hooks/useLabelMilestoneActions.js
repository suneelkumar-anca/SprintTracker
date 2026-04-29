import { useCallback, useState } from "react";
import { publishMilestonePage } from "../services/confluence/index.js";
import { exportToExcel } from "../services/excel/index.js";

// status: "idle" | "loading" | "success" | "error"
function useActionState() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const reset = useCallback(() => { setStatus("idle"); setMessage(""); }, []);

  const run = useCallback(async (fn) => {
    setStatus("loading");
    setMessage("");
    try {
      const result = await fn();
      if (result?.success === false) {
        setStatus("error");
        setMessage(result.error || "Something went wrong");
        setTimeout(reset, 4000);
      } else {
        setStatus("success");
        setMessage("");
        setTimeout(reset, 2500);
      }
      return result;
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Something went wrong");
      setTimeout(reset, 4000);
      return { success: false, error: err.message };
    }
  }, [reset]);

  return { status, message, run };
}

export function useLabelMilestoneActions() {
  const publish = useActionState();
  const exportAct = useActionState();

  const publishMilestoneFromLabels = useCallback(async (issues, labels, boardName = null) => {
    if (!issues || issues.length === 0) return { success: false, error: "No issues selected" };
    const result = await publish.run(async () => {
      const milestoneName = `${boardName || "Team"} - ${labels.join(", ")}`;
      const deadlineDate = issues.reduce((latest, issue) => {
        if (!issue.endDate) return latest;
        return (!latest || issue.endDate > latest) ? issue.endDate : latest;
      }, null);
      return publishMilestonePage(issues, milestoneName, deadlineDate, null);
    });
    // Delay redirect so the success animation is visible first (mirrors SavedReportActions)
    if (result?.success && result.pageUrl) {
      setTimeout(() => window.open(result.pageUrl, "_blank"), 1000);
    }
    return result;
  }, [publish]);

  const exportMilestoneFromLabels = useCallback(async (issues, labels, boardName = null) => {
    if (!issues || issues.length === 0) return { success: false, error: "No issues selected" };
    return exportAct.run(async () => {
      const fileName = `${boardName || "Team"} - ${labels.join(", ")} - ${new Date().toISOString().split("T")[0]}`;
      await exportToExcel(issues, fileName);
      return { success: true };
    });
  }, [exportAct]);

  // legacy compat
  const loading = publish.status === "loading" || exportAct.status === "loading";
  const error = publish.message || exportAct.message;

  return {
    publishMilestoneFromLabels,
    exportMilestoneFromLabels,
    publishStatus: publish.status,
    exportStatus: exportAct.status,
    publishError: publish.message,
    exportError: exportAct.message,
    loading,
    error,
  };
}
