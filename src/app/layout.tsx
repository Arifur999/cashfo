import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import AppToaster from "@/components/smartly/AppToaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND_NAME } from "@/lib/brand";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import QueryProvider from "./providers/QueryProvider";
import "./globals.css";

// The type system: Inter for everything, Hind Siliguri for Bangla text
// (LocaleProvider adds font-bn in Bangla), JetBrains Mono for references,
// account numbers and codes. Inter is variable; Hind Siliguri comes in the
// four weights the design uses.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
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
  // Added to an iPhone's Home Screen (app/manifest.ts, app/apple-icon.png),
  // it opens full screen under its own name -- and only then may it send
  // push notifications.
  appleWebApp: { capable: true, title: BRAND_NAME, statusBarStyle: "default" },
};

// The browser bar in the page's own colour: globals.css's --page, light and dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#08120e" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The reader's language from the cookie, so a Bangla page arrives as
  // lang="bn" (screen readers pick their voice from it) rather than waiting
  // for LocaleProvider to fix it after hydration -- and the root error page,
  // which has no provider at all, gets it too. Only the cookie and the
  // built-in Bangla: no API call here, so that error page still renders
  // when the API doesn't answer.
  const locale = await getLocale();

  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT may add "dark" to <html>
    // before React hydrates, which the server couldn't know about.
    <html
      lang={locale}
      className={`${inter.variable} ${hindSiliguri.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
      <body className="flex min-h-full flex-col bg-page text-ink" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-surface focus:p-4 focus:text-ink focus:shadow-lg"
        >
          {translate(locale, "Skip to main content")}
        </a>
        <QueryProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <AppToaster locale={locale} />
        </QueryProvider>
      </body>
    </html>
  );
}
