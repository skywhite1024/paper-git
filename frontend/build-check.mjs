// Verify production output without disturbing the running development app.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tsconfig = join(here, "tsconfig.json");
const original = readFileSync(tsconfig);
const pages = process.argv.includes("--pages");
let status = 1;
try {
  const run = spawnSync(process.execPath, [join(here, "node_modules/next/dist/bin/next"), "build"], {
    cwd: here, stdio: "inherit", windowsHide: true,
    env: { ...process.env, NEXT_DIST_DIR: pages ? ".next-pages" : ".next-production", NEXT_TELEMETRY_DISABLED: "1", GITHUB_PAGES: pages ? "true" : "false" },
  });
  status = run.status ?? 1;
} finally {
  // Next can add its generated types directory; keep the checked-in config stable.
  writeFileSync(tsconfig, original);
}
if (pages && status === 0) {
  writeFileSync(join(here, ".next-pages/.nojekyll"), "");
  const verify = spawnSync(process.execPath, [join(here, "verify-pages.mjs")], { cwd: here, stdio: "inherit", windowsHide: true });
  status = verify.status ?? 1;
}
process.exit(status);
