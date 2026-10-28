"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { navAppFor } from "@/lib/customer/nav";

// The shell's frame: the sidebar beside the top bar and the one scrolling
// region, on the page ground. It names the app the page is in
// (data-app="money" | "habit"), which globals.css turns into the Habit
// Tracker's teal and slate; on <html> too, so the dialogs, drawers and
// menus portalled to <body> follow.
export function ShellFrame({ children }: { children: React.ReactNode }) {
  const app = navAppFor(usePathname());

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.app = app;
    return () => {
      delete root.dataset.app;
    };
  }, [app]);

  return (
    <div data-app={app} className="flex h-screen overflow-hidden bg-page text-ink print:block print:h-auto print:overflow-visible">
      {children}
    </div>
  );
}
