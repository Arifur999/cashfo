import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND_NAME } from "@/lib/brand";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import QueryProvider from "./providers/QueryProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Bangla text switches to it (LocaleProvider adds font-bn in Bangla).
const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: "Money management for people and businesses",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT may add "dark" to <html>
    // before React hydrates, which the server couldn't know about.
    <html lang="en" className={`${inter.variable} ${hindSiliguri.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes like cz-shortcut-listen onto <body> after the server HTML
          is sent, which otherwise trips React's hydration mismatch check even
          though nothing is actually wrong. */}
      <body className="flex min-h-full flex-col bg-brand-content" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-xl focus:bg-background focus:p-4 focus:text-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
          {/* theme="light": shadcn's Toaster would otherwise follow the OS
              and render dark toasts on the light admin panel. */}
          <Toaster richColors position="top-center" theme="light" />
        </QueryProvider>
      </body>
    </html>
  );
}
