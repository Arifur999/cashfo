import type { Metadata } from "next";
import Script from "next/script";
import { Hind_Siliguri, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Bangla font, loaded now per Prompt 1's requirement to set up the
// font-switching mechanism early. Both font variables are defined here;
// actually switching the active font based on the user's preferredLanguage
// (see the User model's preferredLanguage field) is wired up once the real
// bilingual UI text lands in a later prompt -- for now the app always
// renders with --font-inter active (see globals.css's --font-sans).
const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Money Management Tracker",
  description: "Personal & Business Money Management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning here too -- the beforeInteractive script
    // below adds/removes the "dark" class on this element before React
    // hydrates, based on localStorage/prefers-color-scheme (neither of
    // which the server can see), so its className can legitimately differ
    // from what the server rendered. See ThemeProvider.tsx for the full
    // explanation.
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
      <body className="min-h-full flex flex-col bg-brand-content" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
