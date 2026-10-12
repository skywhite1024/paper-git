// Production build gate that coexists with `next dev`.
// next dev owns .next; building there would break the running dev server,
// so this verifies the build into a throwaway distDir instead.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = ".next-verify";
const tsconfig = join(here, "tsconfig.json");
// `next build` rewrites tsconfig.json (expanding arrays and appending the
// distDir's types path); a verification command must not dirty tracked config.
const tsBackup = join(mkdtempSync(join(tmpdir(), "papergit-ts-")), "tsconfig.json");

copyFileSync(tsconfig, tsBackup);
rmSync(join(here, dist), { recursive: true, force: true });

const run = spawnSync("next", ["build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, NEXT_DIST_DIR: dist },
});

copyFileSync(tsBackup, tsconfig);
rmSync(dirname(tsBackup), { recursive: true, force: true });
rmSync(join(here, dist), { recursive: true, force: true });
process.exit(run.status ?? 1);
