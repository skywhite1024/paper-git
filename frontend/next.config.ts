import type { NextConfig } from "next";

// NEXT_DIST_DIR lets a production build run alongside `next dev` without
// clobbering the dev server's .next output.
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
