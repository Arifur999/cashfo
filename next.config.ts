import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server (.next/standalone/server.js) for the Docker
  // image, without the full node_modules -- see Dockerfile.
  output: "standalone",

  // next dev logs every Server Function call with its arguments -- the
  // sign-in, sign-up and password actions included, so passwords would land
  // in the terminal.
  logging: {
    serverFunctions: false,
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
