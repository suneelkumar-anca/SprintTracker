export const BASE  = "/jira-api";
export const EMAIL = import.meta.env.VITE_JIRA_EMAIL     ?? "";
export const TOKEN = import.meta.env.VITE_JIRA_API_TOKEN ?? "";

export const FIELD_TL_COMMENT    = import.meta.env.VITE_JIRA_FIELD_TL_COMMENT    ?? "customfield_10100";
export const FIELD_REVIEW_RATING = import.meta.env.VITE_JIRA_FIELD_REVIEW_RATING ?? "customfield_10101";
export const FIELD_ARTIFACTS     = import.meta.env.VITE_JIRA_FIELD_ARTIFACTS     ?? "customfield_10102";
export const FIELD_TEAM          = import.meta.env.VITE_JIRA_FIELD_TEAM          ?? "customfield_10103";
export const FIELD_STORY_POINTS_ENV = import.meta.env.VITE_JIRA_FIELD_STORY_POINTS ?? null;

export const SP_CANDIDATES = [
  "customfield_10016",
  "customfield_10028",
  "customfield_10014",
  "customfield_10024",
  "customfield_10034",
  "customfield_10004",
  "customfield_10008",
];

export const ENV_BOARD_ID = import.meta.env.VITE_JIRA_BOARD_ID ?? "";
