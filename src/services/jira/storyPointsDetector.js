import { jiraGet } from "./jiraClient.js";
import { FIELD_STORY_POINTS_ENV } from "./jiraConfig.js";

let _detectedSpFieldId = FIELD_STORY_POINTS_ENV;
let _spDetectionDone   = !!FIELD_STORY_POINTS_ENV;

const SP_NAMES = [
  "story points", "story point estimate", "story point",
  "story points estimate", "estimate", "sp",
];

export async function detectStoryPointsField() {
  if (_spDetectionDone) return;
  _spDetectionDone = true;
  try {
    const allFields = await jiraGet("/rest/api/3/field");
    if (!Array.isArray(allFields)) return;
    const match =
      allFields.find((f) => SP_NAMES.includes((f.name ?? "").toLowerCase()) && f.schema?.type === "number") ??
      allFields.find((f) => SP_NAMES.includes((f.name ?? "").toLowerCase()));
    if (match?.id) _detectedSpFieldId = match.id;
  } catch { /* fall through */ }
}

export function getDetectedSpFieldId() {
  return _detectedSpFieldId;
}
