const BASE = import.meta.env.VITE_CONFLUENCE_BASE_URL?.replace(/\/$/, "") || "";
const EMAIL = import.meta.env.VITE_CONFLUENCE_EMAIL || "";
const TOKEN = import.meta.env.VITE_CONFLUENCE_API_TOKEN || "";
const SPACE_KEY = import.meta.env.VITE_CONFLUENCE_SPACE_KEY || "";
const PARENT_PAGE_ID = import.meta.env.VITE_CONFLUENCE_PARENT_PAGE_ID || "";

export const CONFLUENCE_CONFIG = {
  BASE,
  EMAIL,
  TOKEN,
  SPACE_KEY,
  PARENT_PAGE_ID,
};

export function isConfluenceConfigured() {
  return !!(BASE && EMAIL && TOKEN && SPACE_KEY);
}
