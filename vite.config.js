import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const jiraBase = env.VITE_JIRA_BASE_URL ?? "";

  return {
    plugins: [react()],
    define: {
      global: "globalThis",
      "process.env": "{}",
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
    optimizeDeps: {
      include: ["buffer", "stream-browserify", "events", "util"],
      esbuildOptions: {
        plugins: [
          {
            name: "node-browser-polyfills",
            setup(build) {
              build.onResolve({ filter: /^util$/ }, () => ({
                path: path.resolve("node_modules/util/util.js"),
              }));
              build.onResolve({ filter: /^events$/ }, () => ({
                path: path.resolve("node_modules/events/events.js"),
              }));
            },
          },
        ],
      },
    },
    server: {
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

