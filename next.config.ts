import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,

  // Immutable caching is limited to content-addressed, public avatar releases.
  async headers() {
    return [
      { source: "/interview-avatar/releases/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/interview-avatar/releases/:release/Cveat_Office_Avatar_Web.glb", has: [{ type: "header" as const, key: "accept-encoding", value: ".*\\bbr\\b(?!\\s*;\\s*q=0(?:\\.0*)?(?:\\s*(?:,|$))).*" }], headers: [{ key: "Content-Encoding", value: "br" }, { key: "Content-Type", value: "model/gltf-binary" }, { key: "Vary", value: "Accept-Encoding" }] },
    ];
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/interview-avatar/releases/:release/Cveat_Office_Avatar_Web.glb", has: [{ type: "header" as const, key: "accept-encoding", value: ".*\\bbr\\b(?!\\s*;\\s*q=0(?:\\.0*)?(?:\\s*(?:,|$))).*" }], destination: "/interview-avatar/releases/:release/Cveat_Office_Avatar_Web.glb.br" }], afterFiles: [], fallback: [] };
  },

  experimental: {
    agentUpgrade: "security",
  },
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
