import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server (.next/standalone/server.js) for the Docker
  // image, without the full node_modules -- see Dockerfile.
  output: "standalone",
};

export default nextConfig;
