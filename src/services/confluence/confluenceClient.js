import { CONFLUENCE_CONFIG } from "./confluenceConfig.js";

export async function confluenceGet(path) {
  // Use local proxy during development: /confluence-api → Confluence server
  const url = `/confluence-api/wiki/rest/api${path}`;
  const auth = btoa(`${CONFLUENCE_CONFIG.EMAIL}:${CONFLUENCE_CONFIG.TOKEN}`);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const errMsg = `HTTP ${res.status}: ${res.statusText}${errBody ? ` - ${errBody}` : ""}`;
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err) {
    console.error("Confluence GET error:", path, err.message);
    throw err;
  }
}

export async function confluencePost(path, data) {
  const url = `/confluence-api/wiki/rest/api${path}`;
  const auth = btoa(`${CONFLUENCE_CONFIG.EMAIL}:${CONFLUENCE_CONFIG.TOKEN}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const errMsg = `HTTP ${res.status}: ${res.statusText}${errBody ? ` - ${errBody}` : ""}`;
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err) {
    console.error("Confluence POST error:", path, err.message);
    throw err;
  }
}

export async function confluencePut(path, data) {
  const url = `/confluence-api/wiki/rest/api${path}`;
  const auth = btoa(`${CONFLUENCE_CONFIG.EMAIL}:${CONFLUENCE_CONFIG.TOKEN}`);
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error("Confluence PUT error:", path, err);
    throw err;
  }
}
