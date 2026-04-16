import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishSprintPage } from "../publishConfluencePage.js";
import * as confluenceClient from "../confluenceClient.js";
import * as pageBuilder from "../confluencePageBuilder.js";

vi.mock("../confluenceClient.js");
vi.mock("../confluencePageBuilder.js");
vi.mock("../confluenceConfig.js", () => ({
  CONFLUENCE_CONFIG: {
    BASE: "https://example.atlassian.net",
    SPACE_KEY: "TEST",
  },
}));

const mockTickets = [
  {
    key: "PROJ-1",
    fields: {
      summary: "Test ticket",
      assignee: { displayName: "John Doe" },
      customfield_10061: 5,
    },
  },
];

describe("publishSprintPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageBuilder.buildConfluencePage.mockResolvedValue("<p>Test HTML</p>");
    confluenceClient.confluenceGet.mockResolvedValue({ results: [] });
  });

  it("should create new page when it does not exist", async () => {
    confluenceClient.confluenceGet
      .mockResolvedValueOnce({ results: [{ id: "parent123" }] }) // getOrCreateParentPage
      .mockResolvedValueOnce({ results: [] }); // search for existing page

    confluenceClient.confluencePost.mockResolvedValue({
      id: "new-page-123",
      title: "Sprint 49 - report - 2026-04-13",
    });

    const result = await publishSprintPage(mockTickets, "Sprint 49");

    expect(result.success).toBe(true);
    expect(result.isUpdate).toBe(false);
    expect(result.message).toContain("published");
    expect(confluenceClient.confluencePost).toHaveBeenCalledWith(
      "/content",
      expect.objectContaining({
        type: "page",
        title: expect.stringContaining("Sprint 49"),
        space: { key: "TEST" },
      })
    );
  });

  it("should update existing page when it already exists", async () => {
    const existingPage = {
      id: "existing-page-123",
      version: { number: 2 },
      title: "Sprint 49 - report - 2026-04-13",
    };

    confluenceClient.confluenceGet
      .mockResolvedValueOnce({ results: [{ id: "parent123" }] }) // getOrCreateParentPage
      .mockResolvedValueOnce({ results: [existingPage] }); // search for existing page

    confluenceClient.confluencePut.mockResolvedValue({
      id: "existing-page-123",
      title: "Sprint 49 - report - 2026-04-13",
      version: { number: 3 },
    });

    const result = await publishSprintPage(mockTickets, "Sprint 49");

    expect(result.success).toBe(true);
    expect(result.isUpdate).toBe(true);
    expect(result.message).toContain("updated");
    expect(confluenceClient.confluencePut).toHaveBeenCalledWith(
      "/content/existing-page-123",
      expect.objectContaining({
        type: "page",
        version: { number: 3 },
      })
    );
    expect(confluenceClient.confluencePost).not.toHaveBeenCalled();
  });

  it("should return page URL in result", async () => {
    confluenceClient.confluenceGet
      .mockResolvedValueOnce({ results: [{ id: "parent123" }] })
      .mockResolvedValueOnce({ results: [] });

    confluenceClient.confluencePost.mockResolvedValue({
      id: "page-456",
      title: "Sprint 49 - report - 2026-04-13",
    });

    const result = await publishSprintPage(mockTickets, "Sprint 49");

    expect(result.pageUrl).toContain("https://example.atlassian.net");
    expect(result.pageUrl).toContain("page-456");
  });

  it("should handle errors gracefully", async () => {
    confluenceClient.confluenceGet.mockResolvedValueOnce({ results: [{ id: "parent123" }] });
    confluenceClient.confluenceGet.mockResolvedValueOnce({ results: [] });
    confluenceClient.confluencePost.mockRejectedValue(
      new Error("Confluence API error")
    );

    const result = await publishSprintPage(mockTickets, "Sprint 49");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should increment version number when updating", async () => {
    const existingPage = {
      id: "page-id",
      version: { number: 5 },
    };

    confluenceClient.confluenceGet
      .mockResolvedValueOnce({ results: [{ id: "parent123" }] })
      .mockResolvedValueOnce({ results: [existingPage] });

    confluenceClient.confluencePut.mockResolvedValue({ id: "page-id" });

    await publishSprintPage(mockTickets, "Sprint 49");

    const putCall = confluenceClient.confluencePut.mock.calls[0];
    expect(putCall[1].version.number).toBe(6);
  });

  it("should include page HTML in request", async () => {
    pageBuilder.buildConfluencePage.mockReturnValue("<p>Sprint HTML</p>");

    confluenceClient.confluenceGet
      .mockResolvedValueOnce({ results: [{ id: "parent123" }] })
      .mockResolvedValueOnce({ results: [] });

    confluenceClient.confluencePost.mockResolvedValue({
      id: "page-789",
    });

    await publishSprintPage(mockTickets, "Sprint 49");

    const postCall = confluenceClient.confluencePost.mock.calls[0];
    expect(postCall[1].body.storage.value).toBe("<p>Sprint HTML</p>");
  });
});
