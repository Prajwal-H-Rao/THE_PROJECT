/** The Next.js configuration of the api-gateway. It serves the API routes only. */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WHY: the gateway serves API routes only. It holds no page and no image.
  reactStrictMode: true,
};

export default nextConfig;
