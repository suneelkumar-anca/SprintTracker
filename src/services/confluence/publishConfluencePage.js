import { confluenceGet, confluencePost, confluencePut } from "./confluenceClient.js";
import { buildConfluencePage } from "./confluencePageBuilder.js";
import { buildMilestonePage } from "./confluenceMilestonePageBuilder.js";
import { CONFLUENCE_CONFIG } from "./confluenceConfig.js";

async function getOrCreateParentPage() {
  const parentPageId = CONFLUENCE_CONFIG.PARENT_PAGE_ID;
  
  if (parentPageId) {
    return parentPageId;
  }

  try {
    const res = await confluenceGet(`/content?spaceKey=${CONFLUENCE_CONFIG.SPACE_KEY}&title=Sprint Reports&limit=1`);
    if (res.results && res.results.length > 0) {
      console.log("Found existing Sprint Reports parent page:", res.results[0].id);
      return res.results[0].id;
    }
  } catch (err) {
    console.warn("Could not find existing Sprint Reports page:", err.message);
  }

  try {
    console.log("Creating new Sprint Reports parent page in space:", CONFLUENCE_CONFIG.SPACE_KEY);
    const createRes = await confluencePost("/content", {
      type: "page",
      title: "Sprint Reports",
      space: { key: CONFLUENCE_CONFIG.SPACE_KEY },
      body: {
        storage: {
          value: "<p>Automated sprint reports exported from Sprint Tracker.</p>",
          representation: "storage",
        },
      },
    });
    console.log("Created parent page with ID:", createRes.id);
    return createRes.id;
  } catch (err) {
    console.error("Failed to create Sprint Reports parent page - Error:", err.message);
    throw new Error(`Could not create parent page: ${err.message}. Check your Confluence space key and permissions.`);
  }
}

async function getOrCreateMilestoneParentPage() {
  try {
    const res = await confluenceGet(`/content?spaceKey=${CONFLUENCE_CONFIG.SPACE_KEY}&title=Milestone Reports&limit=1`);
    if (res.results && res.results.length > 0) {
      console.log("Found existing Milestone Reports parent page:", res.results[0].id);
      return res.results[0].id;
    }
  } catch (err) {
    console.warn("Could not find existing Milestone Reports page:", err.message);
  }

  try {
    console.log("Creating new Milestone Reports parent page in space:", CONFLUENCE_CONFIG.SPACE_KEY);
    const createRes = await confluencePost("/content", {
      type: "page",
      title: "Milestone Reports",
      space: { key: CONFLUENCE_CONFIG.SPACE_KEY },
      body: {
        storage: {
          value: "<p>Automated milestone reports exported from Sprint Tracker.</p>",
          representation: "storage",
        },
      },
    });
    console.log("Created milestone parent page with ID:", createRes.id);
    return createRes.id;
  } catch (err) {
    console.error("Failed to create Milestone Reports parent page - Error:", err.message);
    throw new Error(`Could not create milestone parent page: ${err.message}. Check your Confluence space key and permissions.`);
  }
}

export async function publishSprintPage(tickets, sprintName) {
  try {
    // Get or create parent page
    const parentPageId = await getOrCreateParentPage();

    // Build page content
    const pageHtml = await buildConfluencePage(tickets, sprintName);
    
    // Generate page title: "{sprint name} - report - {timestamp}"
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const pageTitle = `${sprintName} - report - ${timestamp}`;

    // Search for existing page with this title
    let existingPage = null;
    try {
      const searchRes = await confluenceGet(`/content?spaceKey=${CONFLUENCE_CONFIG.SPACE_KEY}&title=${encodeURIComponent(pageTitle)}&limit=1`);
      if (searchRes.results && searchRes.results.length > 0) {
        existingPage = searchRes.results[0];
        console.log("Found existing sprint page:", pageTitle, "ID:", existingPage.id);
      }
    } catch (err) {
      console.warn("Could not search for existing page:", err.message);
    }

    let result;
    if (existingPage) {
      // Update existing page
      const updateRes = await confluencePut(`/content/${existingPage.id}`, {
        type: "page",
        title: pageTitle,
        version: {
          number: existingPage.version.number + 1,
        },
        body: {
          storage: {
            value: pageHtml,
            representation: "storage",
          },
        },
      });
      const pageUrl = `${CONFLUENCE_CONFIG.BASE}/wiki/spaces/${CONFLUENCE_CONFIG.SPACE_KEY}/pages/${updateRes.id}`;
      result = {
        success: true,
        pageId: updateRes.id,
        pageTitle: pageTitle,
        pageUrl: pageUrl,
        message: `Sprint page updated: ${pageTitle}`,
        isUpdate: true,
      };
    } else {
      // Create new page
      const createRes = await confluencePost("/content", {
        type: "page",
        title: pageTitle,
        space: { key: CONFLUENCE_CONFIG.SPACE_KEY },
        ancestors: [{ id: parentPageId }],
        body: {
          storage: {
            value: pageHtml,
            representation: "storage",
          },
        },
      });
      const pageUrl = `${CONFLUENCE_CONFIG.BASE}/wiki/spaces/${CONFLUENCE_CONFIG.SPACE_KEY}/pages/${createRes.id}`;
      result = {
        success: true,
        pageId: createRes.id,
        pageTitle: pageTitle,
        pageUrl: pageUrl,
        message: `Sprint page published: ${pageTitle}`,
        isUpdate: false,
      };
    }
    
    return result;
  } catch (err) {
    console.error("Error publishing sprint page to Confluence:", err);
    return {
      success: false,
      error: err.message || "Failed to publish sprint page",
    };
  }
}

export async function publishMilestonePage(tickets, milestoneName, deadlineDate) {
  try {
    const parentPageId = await getOrCreateMilestoneParentPage();
    const pageHtml = await buildMilestonePage(tickets, milestoneName, deadlineDate);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const pageTitle = `${milestoneName} - milestone report - ${timestamp}`;

    let existingPage = null;
    try {
      const searchRes = await confluenceGet(`/content?spaceKey=${CONFLUENCE_CONFIG.SPACE_KEY}&title=${encodeURIComponent(pageTitle)}&limit=1`);
      if (searchRes.results && searchRes.results.length > 0) {
        existingPage = searchRes.results[0];
        console.log("Found existing milestone page:", pageTitle, "ID:", existingPage.id);
      }
    } catch (err) {
      console.warn("Could not search for existing milestone page:", err.message);
    }

    let result;
    if (existingPage) {
      const updateRes = await confluencePut(`/content/${existingPage.id}`, {
        type: "page",
        title: pageTitle,
        version: { number: existingPage.version.number + 1 },
        body: { storage: { value: pageHtml, representation: "storage" } },
      });
      const pageUrl = `${CONFLUENCE_CONFIG.BASE}/wiki/spaces/${CONFLUENCE_CONFIG.SPACE_KEY}/pages/${updateRes.id}`;
      result = { success: true, pageId: updateRes.id, pageTitle, pageUrl, message: `Milestone page updated: ${pageTitle}`, isUpdate: true };
    } else {
      const createRes = await confluencePost("/content", {
        type: "page",
        title: pageTitle,
        space: { key: CONFLUENCE_CONFIG.SPACE_KEY },
        ancestors: [{ id: parentPageId }],
        body: { storage: { value: pageHtml, representation: "storage" } },
      });
      const pageUrl = `${CONFLUENCE_CONFIG.BASE}/wiki/spaces/${CONFLUENCE_CONFIG.SPACE_KEY}/pages/${createRes.id}`;
      result = { success: true, pageId: createRes.id, pageTitle, pageUrl, message: `Milestone page published: ${pageTitle}`, isUpdate: false };
    }
    return result;
  } catch (err) {
    console.error("Error publishing milestone page to Confluence:", err);
    return { success: false, error: err.message || "Failed to publish milestone page" };
  }
}
