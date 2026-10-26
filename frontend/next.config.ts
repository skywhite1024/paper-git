import type { NextConfig } from "next";

const pages = process.env.GITHUB_PAGES === "true";
// Keep the curated app separate from legacy build output and parallel checks.
const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BASE_PATH: pages ? process.env.PAGES_BASE_PATH ?? "/paper-git" : "" },
  distDir: process.env.NEXT_DIST_DIR ?? ".next-local",
  ...(pages ? {
    output: "export",
    basePath: process.env.PAGES_BASE_PATH ?? "/paper-git",
    trailingSlash: true,
  } : {}),
};

export default nextConfig;
