import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/lib/brand";

// The web app manifest (/manifest.webmanifest): what a phone needs to add
// Smartly to its Home Screen, which iPhones require before a site may send
// push notifications. Colours are globals.css's light tokens: --forest for
// the title bar, --page behind the splash.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: "Income, expenses, loans, savings, passwords and habits, together.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f3f6f4",
    theme_color: "#0b3d2e",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
