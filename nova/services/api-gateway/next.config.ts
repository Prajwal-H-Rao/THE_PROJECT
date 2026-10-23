/** The Next.js configuration of the api-gateway. It serves the API routes only. */

import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WHY: the gateway serves API routes only. It holds no page and no image.
  reactStrictMode: true,
  // WHY: the image build of module 01 task 14 copies the standalone server
  // output. The plain build still serves `next start` for local work.
  output: "standalone",
  // WHY: the shared contracts package lives outside this service. The bundler
  // needs the root of the monorepo to read the node_modules symlink across it.
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
};

export default nextConfig;
