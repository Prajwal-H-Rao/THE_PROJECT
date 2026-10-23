/** The Next.js configuration of the web app. It serves the locale-routed UI. */

import createNextIntlPlugin from "next-intl/plugin";

import type { NextConfig } from "next";

// WHY: the plugin wires the per-request message catalog at i18n/request.ts.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
