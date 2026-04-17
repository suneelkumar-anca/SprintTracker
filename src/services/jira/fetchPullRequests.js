import { jiraGet } from "./jiraClient.js";

const APP_TYPES = ["stash", "bitbucket", "github", "github-enterprise", "gitlab"];

function withTimeout(promise, timeoutMs = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function fetchPullRequests(numericId) {
  if (!numericId) return [];
  const requests = APP_TYPES.map((app) => ({
    app,
    promise: withTimeout(
      jiraGet(
        `/rest/dev-status/1.0/issue/detail?issueId=${numericId}&applicationType=${app}&dataType=pullrequest`
      ),
      15000
    ),
  }));

  const settled = await Promise.allSettled(requests.map((r) => r.promise));
  const seen = new Set();
  const allPRs = [];

  settled.forEach((result, i) => {
    if (result.status !== "fulfilled") {
      if (result.reason) {
        console.debug(`PR fetch for ${requests[i].app} skipped:`, result.reason.message);
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
