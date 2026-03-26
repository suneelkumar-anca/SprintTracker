import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { buildConfig, optimizeDepsConfig, previewConfig } from "./vite.build.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const jiraBase = env.VITE_JIRA_BASE_URL ?? "";

  return {
    plugins: [react()],
    build: buildConfig,
    define: {
      global: "globalThis",
      "process.env": JSON.stringify({ NODE_ENV: mode }),
      "process.version": '"v18.0.0"',
      "process.browser": "true",
    },
    resolve: {
      alias: {
        buffer: "buffer",
        stream: "stream-browserify",
        events: "events",
        util: "util",
      },
    },
    test: { environment: "jsdom", globals: true },
    optimizeDeps: optimizeDepsConfig,
    preview: previewConfig,
    server: {
      warmup: { clientFiles: ["./src/**/*.{js,jsx}"] },
      proxy: jiraBase
        ? {
            "/jira-api": {
              target: jiraBase,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/jira-api/, ""),
              secure: true,
            },
          }
        : {},
    },
  };
});

