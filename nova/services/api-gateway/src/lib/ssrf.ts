/** The SSRF guard for the gateway. Prevents server-side request forgery. */

import type { NextRequest } from "next/server";
import { settings } from "@/lib/settings";

/** The SSRF guard configuration. */
interface SsrfConfig {
  readonly blockedRanges: readonly string[];
  readonly allowedPorts: readonly number[];
  readonly blockedPorts: readonly number[];
  readonly allowLoopback: boolean;
  readonly allowPrivate: boolean;
}

/** The cached SSRF configuration. */
let ssrfConfig: SsrfConfig | null = null;

/** Get the SSRF config, building it on first call. */
function getSsrfConfig(): SsrfConfig {
  if (ssrfConfig === null) {
    ssrfConfig = {
      blockedRanges: [
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "127.0.0.0/8",
        "169.254.0.0/16",
        "::1/128",
        "fc00::/7",
      ],
      allowedPorts: [80, 443, 8080, 8443],
      blockedPorts: [22, 23, 25, 110, 143, 993, 995, 1723, 3306, 5432, 6379, 8080, 8443, 27017],
      allowLoopback: false,
      allowPrivate: false,
    };
  }
  return ssrfConfig;
}

/** Check if an IP address is in a CIDR range. */
function ipInCidr(ip: string, cidr: string): boolean {
  // Simple implementation for IPv4
  const [rangeIp, bits] = cidr.split("/");
  if (bits === "32") return ip === rangeIp;
  // Simplified - in production use a proper IP library
  return false;
}

/** Check if a host:port is allowed by SSRF guard. */
export function checkSsrfGuard(host: string, port?: number): boolean {
  const config = getSsrfConfig();
  
  // Block private ranges
  // In production, use a proper IP library like ipaddr.js
  // This is a simplified check
  const privateRanges = [
    "10.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "192.168.",
    "127.",
    "169.254.",
  ];
  
  for (const range of config.blockedRanges) {
    if (range.endsWith("/8")) {
      const prefix = range.slice(0, -3);
      if (host.startsWith(prefix)) return false;
    } else if (range.endsWith("/12")) {
      // 172.16.0.0/12
      if (host.startsWith("172.16.") || host.startsWith("172.17.") || 
          host.startsWith("172.18.") || host.startsWith("172.19.") ||
          host.startsWith("172.20.") || host.startsWith("172.21.") ||
          host.startsWith("172.22.") || host.startsWith("172.23.") ||
          host.startsWith("172.24.") || host.startsWith("172.25.") ||
          host.startsWith("172.26.") || host.startsWith("172.27.") ||
          host.startsWith("172.28.") || host.startsWith("172.29.") ||
          host.startsWith("172.30.") || host.startsWith("172.31.")) {
        return false;
      }
    } else if (range.endsWith("/16")) {
      const prefix = range.slice(0, -3);
      if (host.startsWith(prefix)) return false;
    } else if (host === range || host.startsWith(range + ".")) {
      return false;
    }
  }
  
  // Check loopback
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return false;
  }
  
  return true;
}

/** Check if a port is allowed. */
export function isPortAllowed(port: number): boolean {
  const config = getSsrfConfig();
  if (config.allowedPorts.length > 0 && !config.allowedPorts.includes(port)) {
    return false;
  }
  if (config.blockedPorts.includes(port)) {
    return false;
  }
  return true;
}