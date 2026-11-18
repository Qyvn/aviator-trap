import type { NextConfig } from "next";

const pagesBase = "/aviator-trap";
const forGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Cache Components turns on Partial Prerendering, which cannot run in a static export.
  cacheComponents: false,
  partialPrefetching: false,
  // The dev server only accepts its own hostname. Playtests open 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  ...(forGithubPages
    ? {
        basePath: pagesBase,
        assetPrefix: pagesBase,
      }
    : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
