import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  // Allow access from any local network device (phone, tablet, etc.)
  allowedDevOrigins: [
    '192.168.100.10',
    '192.168.1.*',
    '192.168.0.*',
    '10.0.*.*',
  ],
  experimental: {
    // Next 15 specific settings if needed
  }
};

export default withPWA(nextConfig);
