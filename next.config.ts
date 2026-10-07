import type { NextConfig } from "next";

// Baseline security headers for every response. A full Content-Security-Policy
// is left out on purpose: the statically rendered page relies on Next's inline
// scripts, and the physics engine compiles WebAssembly at runtime.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site is never meant to be framed (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
  // Some crawlers and tools ask for /favicon.ico directly: serve the generated icon.
  rewrites: async () => [{ source: "/favicon.ico", destination: "/icon" }],
};

export default nextConfig;
