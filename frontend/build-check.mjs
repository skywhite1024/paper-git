// Production build gate that coexists with `next dev`.
// next dev owns .next; building there would break the running dev server,
// so this verifies the build into a throwaway distDir instead.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = ".next-verify";
rmSync(join(dirname(fileURLToPath(import.meta.url)), dist), { recursive: true, force: true });

const run = spawnSync("next", ["build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NEXT_DIST_DIR: dist },
});

rmSync(join(dirname(fileURLToPath(import.meta.url)), dist), { recursive: true, force: true });
process.exit(run.status ?? 1);
