import { jiraGet } from "./jiraClient.js";
import { FIELD_STORY_POINTS_ENV } from "./jiraConfig.js";

// Common Jira story-points field IDs tried in order when env var is not set
const COMMON_SP_FIELDS = ["customfield_10016", "customfield_10028", "customfield_10015", "customfield_10013"];

let _detectedSpFieldId = FIELD_STORY_POINTS_ENV ?? COMMON_SP_FIELDS[0];
let _spDetectionDone   = true; // skip /rest/api/3/field — returns 500 on this instance

const SP_NAMES = [
  "story points", "story point estimate", "story point",
  "story points estimate", "estimate", "sp",
];

export async function detectStoryPointsField() {
  // Detection is pre-resolved via env var or common-field fallback.
  // If you need dynamic detection set VITE_JIRA_FIELD_STORY_POINTS in .env
}

export function getDetectedSpFieldId() {
  return _detectedSpFieldId;
}
