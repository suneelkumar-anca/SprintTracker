import path from "path";

export const optimizeDepsConfig = {
  include: ["buffer", "stream-browserify", "events", "util"],
  esbuildOptions: {
    plugins: [{
      name: "node-browser-polyfills",
      setup(build) {
        build.onResolve({ filter: /^util$/ }, () => ({ path: path.resolve("node_modules/util/util.js") }));
        build.onResolve({ filter: /^events$/ }, () => ({ path: path.resolve("node_modules/events/events.js") }));
      },
    }],
  },
};

export const buildConfig = {
  target: "es2020",
  chunkSizeWarningLimit: 900,
  modulePreload: { polyfill: false },
  rollupOptions: {
    output: {
      manualChunks: { vendor: ["react", "react-dom"] },
    },
  },
};

export const previewConfig = {
  headers: { "Cache-Control": "public, max-age=600" },
};
