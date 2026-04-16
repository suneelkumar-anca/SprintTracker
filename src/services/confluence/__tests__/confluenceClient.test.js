import { describe, it, expect, vi, beforeEach } from "vitest";
import { confluenceGet, confluencePost, confluencePut } from "../confluenceClient.js";

// Mock the config module
vi.mock("../confluenceConfig.js", () => ({
  CONFLUENCE_CONFIG: {
    BASE: "https://test.atlassian.net",
    EMAIL: "test@example.com",
    TOKEN: "test-token",
    SPACE_KEY: "TEST",
    PARENT_PAGE_ID: "",
  },
}));

global.fetch = vi.fn();

describe("confluenceClient", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe("confluenceGet", () => {
    it("should make GET request with Basic Auth", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await confluenceGet("/content?spaceKey=TEST");

      expect(fetch).toHaveBeenCalledWith(
        "/confluence-api/wiki/rest/api/content?spaceKey=TEST",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Authorization": expect.stringContaining("Basic "),
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should return parsed JSON response", async () => {
      const mockData = { results: [{ id: 123, title: "Test Page" }] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await confluenceGet("/content");
      expect(result).toEqual(mockData);
    });

    it("should throw error on non-OK response", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(confluenceGet("/content/invalid")).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(confluenceGet("/content")).rejects.toThrow("Network error");
    });
  });

  describe("confluencePost", () => {
    it("should make POST request with JSON body", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123 }),
      });

      const postData = { type: "page", title: "New Page" };
      await confluencePost("/content", postData);

      expect(fetch).toHaveBeenCalledWith(
        "/confluence-api/wiki/rest/api/content",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": expect.stringContaining("Basic "),
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(postData),
        })
      );
    });

    it("should return created resource data", async () => {
      const mockResponse = { id: 123, title: "New Page", key: "TEST" };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await confluencePost("/content", { title: "New Page" });
      expect(result).toEqual(mockResponse);
    });

    it("should throw error on failure", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      await expect(confluencePost("/content", {})).rejects.toThrow();
    });
  });

  describe("confluencePut", () => {
    it("should make PUT request with JSON body", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
      });

      const putData = { title: "Updated Page" };
      await confluencePut("/content/123", putData);

      expect(fetch).toHaveBeenCalledWith(
        "/confluence-api/wiki/rest/api/content/123",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "Authorization": expect.stringContaining("Basic "),
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(putData),
        })
      );
    });

    it("should throw error on failure", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(confluencePut("/content/invalid", {})).rejects.toThrow();
    });
  });

  describe("Basic Auth header", () => {
    it("should correctly encode email and token", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await confluenceGet("/content");

      const call = fetch.mock.calls[0];
      const authHeader = call[1].headers["Authorization"];
      expect(authHeader).toContain("Basic ");

      // Verify base64 encoding: btoa("test@example.com:test-token")
      const encodedCreds = btoa("test@example.com:test-token");
      expect(authHeader).toContain(encodedCreds);
    });
  });
});
