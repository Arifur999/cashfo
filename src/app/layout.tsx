import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProvider from "./providers/QueryProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Bangla font (Hind Siliguri) comes with full server-side locale support --
// when it lands, load it the same way and select between the two font
// variables based on the active locale.

export const metadata: Metadata = {
  title: {
    default: "Admin Panel",
    template: "%s | Admin Panel",
  },
  description: "Super Admin Panel",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
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
          {/* theme="light": there's no ThemeProvider yet, and shadcn's Toaster
              would otherwise follow the OS and render dark toasts on this
              light-only panel. */}
          <Toaster richColors position="top-center" theme="light" />
        </QueryProvider>
      </body>
    </html>
  );
}
