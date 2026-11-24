import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Shown in the footer, Settings and /api/health. Docker builds pass GIT_COMMIT
// because .git is not in the build context; local builds read it from git.
const version: string = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;
function commit() {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
  try { return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; }
}
const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg"],
  env: { APP_VERSION: version, APP_COMMIT: commit().slice(0, 40) },
};
export default config;
