import { SP_CANDIDATES, FIELD_TL_COMMENT, FIELD_REVIEW_RATING, FIELD_ARTIFACTS } from "./jiraConfig.js";
import { getDetectedSpFieldId } from "./storyPointsDetector.js";

export function buildIssueFields(withDescription = false) {
  const spFields = [...(getDetectedSpFieldId() ? [getDetectedSpFieldId()] : []), ...SP_CANDIDATES];
  const base = [
    "summary", "status", "assignee", ...spFields, "customfield_10020",
    "priority", "issuetype", "reporter", "labels", "components",
    "duedate", "created", "updated", "timespent", "aggregatetimespent",
    FIELD_TL_COMMENT, FIELD_REVIEW_RATING, FIELD_ARTIFACTS,
  ];
  if (withDescription) base.splice(1, 0, "description");
  return base.join(",");
}
