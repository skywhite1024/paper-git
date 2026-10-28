// Refresh verified identities only. Repository discovery and paper/version matching stay manual.
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const path = new URL("../frontend/content/paper-metrics.json", import.meta.url);
const snapshot = JSON.parse(await readFile(path, "utf8"));
const run = promisify(execFile);
const openLicenses = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "GPL-2.0", "GPL-3.0", "LGPL-2.1", "LGPL-3.0", "AGPL-3.0", "MPL-2.0", "ISC", "Unlicense", "CC0-1.0", "BSL-1.0", "Zlib"]);
async function retry(action) {
  for (let attempt = 0; ; attempt++) {
    try { return await action(); } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
}

const repoNames = [...new Set(Object.values(snapshot.papers).flatMap(({ github }) => github.repo ? [github.repo] : []))];
const repositories = new Map();
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < repoNames.length) {
    const name = repoNames[next++];
    const data = await retry(async () => {
      const { stdout } = await run("gh", ["api", `repos/${name}`], { windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024 });
      const value = JSON.parse(stdout);
      if (!value.full_name || !Number.isSafeInteger(value.stargazers_count) || value.stargazers_count < 0 || value.private) throw new Error(`Invalid public repository: ${name}`);
      return value;
    });
    repositories.set(name, data);
  }
}));

const lookupIds = [...new Set(Object.values(snapshot.papers).flatMap(({ citations }) => citations.lookupId ? [citations.lookupId] : []))];
const papers = await retry(async () => {
  const response = await fetch("https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,citationCount,url", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: lookupIds }), signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Semantic Scholar returned ${response.status}`);
  const result = await response.json();
  if (!Array.isArray(result) || result.length !== lookupIds.length) throw new Error("Invalid citation batch");
  return new Map(lookupIds.map((id, i) => [id, result[i]]));
});

for (const { github, citations } of Object.values(snapshot.papers)) {
  if (github.repo) {
    const repo = repositories.get(github.repo);
    const previousURL = `https://github.com/${github.repo}`;
    github.url = github.url.replace(previousURL, repo.html_url);
    github.repo = repo.full_name;
    github.stars = repo.stargazers_count;
    const license = repo.license?.spdx_id;
    github.license = license && license !== "NOASSERTION" ? license : null;
    github.status = openLicenses.has(license) ? "open" : "public";
  }
  if (citations.lookupId) {
    const paper = papers.get(citations.lookupId);
    if (!paper || paper.paperId !== citations.paperId || !Number.isSafeInteger(paper.citationCount) || paper.citationCount < 0) throw new Error(`Citation identity changed or unavailable: ${citations.lookupId}`);
    citations.count = paper.citationCount;
    citations.url = paper.url;
    citations.title = paper.title;
  }
}
snapshot.checkedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
if (process.argv.includes("--check")) console.log(`Verified ${repoNames.length} repositories and ${lookupIds.length} citation records; snapshot unchanged.`);
else {
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Updated metrics snapshot: ${snapshot.checkedAt}. Review the diff before publishing.`);
}
