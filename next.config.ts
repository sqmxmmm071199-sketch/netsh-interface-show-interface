import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["freebee-diabetic-sliced.ngrok-free.dev"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
