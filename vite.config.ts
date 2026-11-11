import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Baked into every build so the app knows exactly which version it is running
// (used by the update check). The host updater passes SMARTBUDGET_COMMIT.
const appVersion: string = JSON.parse(readFileSync("./package.json", "utf8")).version;
function gitCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}
const appCommit = process.env.SMARTBUDGET_COMMIT || gitCommit();
// "owner/repo" of the GitHub repository this build came from (where updates are checked).
function gitHubRepo(): string {
  try {
    const url = execSync("git config --get remote.origin.url", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1] ?? "";
  } catch {
    return "";
  }
}
const appRepo = process.env.SMARTBUDGET_UPDATE_REPO || gitHubRepo();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_REPO__: JSON.stringify(appRepo),
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  css: {
    transformer: "lightningcss",
  },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    nitro({ defaultPreset: "node-server" }),
    viteReact(),
  ],
});
