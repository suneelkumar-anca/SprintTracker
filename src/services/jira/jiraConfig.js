export const BASE  = "/jira-api";
export const EMAIL = import.meta.env.VITE_JIRA_EMAIL     ?? "";
export const TOKEN = import.meta.env.VITE_JIRA_API_TOKEN ?? "";

export const FIELD_TL_COMMENT    = import.meta.env.VITE_JIRA_FIELD_TL_COMMENT    ?? "customfield_10100";
export const FIELD_REVIEW_RATING = import.meta.env.VITE_JIRA_FIELD_REVIEW_RATING ?? "customfield_10101";
export const FIELD_ARTIFACTS     = import.meta.env.VITE_JIRA_FIELD_ARTIFACTS     ?? "customfield_10102";
export const FIELD_TEAM          = import.meta.env.VITE_JIRA_FIELD_TEAM          ?? "customfield_10001";
export const FIELD_STORY_POINTS_ENV = import.meta.env.VITE_JIRA_FIELD_STORY_POINTS ?? null;

export const SP_CANDIDATES = [
  "customfield_10016",
  "customfield_10028",
  "customfield_10014",
  "customfield_10024",
  "customfield_10034",
  "customfield_10004",
  "customfield_10008",
  "customfield_10057",
];

export const ENV_BOARD_ID = import.meta.env.VITE_JIRA_BOARD_ID ?? "";

// Comma-separated Jira issue keys used for personal leave tracking in Tempo.
export const LEAVE_ISSUE_KEYS = (import.meta.env.VITE_LEAVE_ISSUE_KEYS ?? "INT-2,INT-4")
  .split(",").map(k => k.trim().toUpperCase()).filter(Boolean);

// Comma-separated Jira issue keys used for public holiday tracking in Tempo.
export const HOLIDAY_ISSUE_KEYS = (import.meta.env.VITE_HOLIDAY_ISSUE_KEYS ?? "INT-24")
  .split(",").map(k => k.trim().toUpperCase()).filter(Boolean);

export const TEMPO_API_TOKEN = import.meta.env.VITE_TEMPO_API_TOKEN ?? "";
export const TEMPO_BASE = "/tempo-api";
