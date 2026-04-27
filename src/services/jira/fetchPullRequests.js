import { jiraGet } from "./jiraClient.js";

const APP_TYPES = ["stash", "bitbucket", "github", "github-enterprise", "gitlab"];
const PR_TIMEOUT_MS = 30000; // 30 seconds per request

export async function fetchPullRequests(numericId) {
  if (!numericId) return [];
  
  const requests = APP_TYPES.map((app) => ({
    app,
    promise: (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PR_TIMEOUT_MS);
        
        try {
          const result = await jiraGet(
            `/rest/dev-status/1.0/issue/detail?issueId=${numericId}&applicationType=${app}&dataType=pullrequest`,
            { signal: controller.signal }
          );
          return result;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new Error(`Request timeout after ${PR_TIMEOUT_MS}ms`);
        }
        throw err;
      }
    })(),
  }));

  const settled = await Promise.allSettled(requests.map((r) => r.promise));
  const seen = new Set();
  const allPRs = [];

  settled.forEach((result, i) => {
    if (result.status !== "fulfilled") {
      if (result.reason) {
        console.warn(`PR fetch for ${requests[i].app} failed:`, result.reason.message);
      }
      return;
    }
    const prs = result.value?.detail?.[0]?.pullRequests ?? [];
    prs.forEach((pr) => {
      const key = pr.url ?? pr.id;
      if (seen.has(key)) return;
      seen.add(key);
      allPRs.push({
        id:     pr.url ?? `${requests[i].app}-${pr.id}`,
        name:   pr.name ?? `PR #${pr.id}`,
        url:    pr.url,
        status: pr.status,
        author: pr.author?.name ?? pr.author?.displayName ?? null,
        repo:   pr.destination?.repository?.name ?? pr.source?.repository?.name ?? null,
        source: requests[i].app,
      });
    });
  });
  return allPRs;
}
