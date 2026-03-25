import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const jiraBase = env.VITE_JIRA_BASE_URL ?? "";

  return {
    plugins: [react()],
    define: {
      global: "globalThis",
    },
    resolve: {
      alias: {
        buffer: "buffer",
      },
    },
    optimizeDeps: {
      include: ["buffer"],
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

