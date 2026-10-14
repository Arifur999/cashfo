"use client";

import { Check, CircleAlert, CircleOff, Copy, Info, X } from "lucide-react";
import { Toaster, type ToasterProps } from "sonner";
import { cn } from "@/lib/utils";

const icon = (className: string, glyph: React.ReactNode) => <span className={cn("flex size-7 items-center justify-center rounded-full [&_svg]:size-4", className)}>{glyph}</span>;

// Toasts as the design draws them: dark, 16px radius, the round icon in
// the meaning's colour, the action in mint. Bottom left on desktop; sonner
// moves them to the bottom edge on phones. They leave after 5 seconds, 8
// when there is an Undo.
const AppToaster = (props: ToasterProps) => (
  <Toaster
    position="bottom-left"
    duration={5000}
    gap={12}
    offset={24}
    mobileOffset={16}
    icons={{
      success: icon("bg-[#4CC995] text-forest", <Check strokeWidth={2.5} />),
      info: icon("bg-mint-200 text-forest", <Copy />),
      warning: icon("bg-[#F2B84B] text-[#04140E]", <CircleOff />),
      error: icon("bg-[#E5484D] text-white", <CircleAlert />),
      loading: icon("bg-white/14 text-white", <Info />),
      close: <X className="size-[15px]" />,
    }}
    closeButton
    toastOptions={{
      unstyled: true,
      classNames: {
        toast: "flex w-full max-w-105 items-center gap-3 rounded-lg bg-ink px-4 py-3 font-sans text-body text-white shadow-float dark:bg-surface-raised dark:text-ink dark:ring-1 dark:ring-line",
        content: "flex min-w-0 flex-1 flex-col gap-0.5",
        title: "font-medium",
        description: "text-small text-white/70 dark:text-ink-muted",
        actionButton: "shrink-0 text-body font-bold text-mint-200 hover:underline dark:text-emerald",
        cancelButton: "shrink-0 text-body font-semibold text-white/70 hover:underline dark:text-ink-muted",
        closeButton: "static order-last flex size-7 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent text-white/60 hover:text-white dark:text-ink-muted dark:hover:text-ink",
        icon: "m-0 shrink-0",
      },
    }}
    {...props}
  />
);

export default AppToaster;
