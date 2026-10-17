import path from "node:path";
import type { NextConfig } from "next";

// The shadcn primitives in components/ui import { cn } from "cn". That bare
// name must load lib/cn.ts -- the merger that knows text-small, text-body
// and the rest -- or a button given "text-small" loses its text colour.
// tsconfig maps it for TypeScript, but webpack resolved the npm package
// anyway, so both bundlers get the alias here. Exact match only: lib/cn.ts
// itself imports "cn/config" from the package.
const CN_MODULE = path.join(process.cwd(), "src/lib/cn.ts");

const nextConfig: NextConfig = {
  // A self-contained server (.next/standalone/server.js) for the Docker
  // image, without the full node_modules -- see Dockerfile.
  output: "standalone",

  turbopack: {
    resolveAlias: { cn: "./src/lib/cn.ts" },
  },

  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, cn$: CN_MODULE };
    return config;
  },

  // next dev logs every Server Function call with its arguments -- the
  // sign-in, sign-up and password actions included, so passwords would land
  // in the terminal.
  logging: {
    serverFunctions: false,
  },

  experimental: {
    serverActions: {
      // Photos and avatars are uploaded through Server Actions, which refuse
      // a body over 1MB by default -- every phone photo failed. The API takes
      // images up to 5MB; this leaves room for the multipart framing.
      bodySizeLimit: "6mb",
    },
  },

  // Query strings carry over, so ?redirect= and ?error= survive.
  async redirects() {
    return [
      // The admin panel's own sign-in page, from before the whole site
      // shared /login -- for bookmarks, and Google sign-ins already under way.
      { source: "/admin/login", destination: "/login", permanent: false },
      { source: "/admin/login/google", destination: "/login/google", permanent: false },
      { source: "/admin", destination: "/admin/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
