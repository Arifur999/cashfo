import type { Metadata } from "next";
import { Anek_Bangla, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import AppToaster from "@/components/smartly/AppToaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND_NAME } from "@/lib/brand";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import QueryProvider from "./providers/QueryProvider";
import "./globals.css";

// The Smartly type system: Plus Jakarta Sans for everything, Anek Bangla for
// Bangla text (LocaleProvider adds font-bn in Bangla), JetBrains Mono for
// references, account numbers and codes. All three are variable fonts, so
// every weight the design uses comes from one file each.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const anekBangla = Anek_Bangla({
  variable: "--font-anek-bangla",
  subsets: ["bengali", "latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s | ${BRAND_NAME}`,
  },
  description: "Income, expenses, loans, savings, passwords and habits, together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT may add "dark" to <html>
    // before React hydrates, which the server couldn't know about.
    <html
      lang="en"
      className={`${jakarta.variable} ${anekBangla.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes like cz-shortcut-listen onto <body> after the server HTML
          is sent, which otherwise trips React's hydration mismatch check even
          though nothing is actually wrong. */}
      <body className="flex min-h-full flex-col bg-cream text-ink" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-surface focus:p-4 focus:text-ink focus:shadow-lg"
        >
          Skip to main content
        </a>
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <AppToaster />
        </QueryProvider>
      </body>
    </html>
  );
}
