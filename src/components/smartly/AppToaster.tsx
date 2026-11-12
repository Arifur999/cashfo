"use client";

import { Check, CircleAlert, CircleOff, Copy, Info, X } from "lucide-react";
import { Toaster, type ToasterProps } from "sonner";
import { translate, type Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

// The boards draw a bare 15px glyph in the meaning's colour, no round tile.
const icon = (className: string, glyph: React.ReactNode) => <span className={cn("flex items-center justify-center [&_svg]:size-3.75", className)}>{glyph}</span>;

// Toasts as the v16 boards draw them: a dark 44px pill centred at the
// bottom (28px up), a bare glyph in the meaning's colour, 13.5px semibold
// words, the action in mint. On phones sonner keeps them at the bottom edge, 88px up so they clear the
// floating Add button (24px off the edge, 56px tall, an 8px gap). They
// leave after 5 seconds, 8 when there is an Undo. The toast is dark in both themes, so the green and
// amber icons take the night palette's fixed colours; the red is the danger
// fill.
// The root layout sits outside LocaleProvider, so it passes the reader's
// language for the region's and the close button's read-out names.
const AppToaster = ({ locale = "en", ...props }: ToasterProps & { locale?: Locale }) => (
  <Toaster
    containerAriaLabel={translate(locale, "Notifications")}
    position="bottom-center"
    // The column the pills are centred in; each pill is as wide as its words.
    style={{ "--width": "min(560px, calc(100vw - 32px))" } as React.CSSProperties}
    duration={5000}
    gap={12}
    offset={28}
    mobileOffset={{ bottom: 88, left: 16, right: 16 }}
    icons={{
      success: icon("text-mint-200", <Check strokeWidth={3} />),
      info: icon("text-mint-200", <Copy strokeWidth={2.5} />),
      warning: icon("text-night-amber", <CircleOff strokeWidth={2.5} />),
      error: icon("text-night-coral", <CircleAlert strokeWidth={2.5} />),
      loading: icon("text-white", <Info strokeWidth={2.5} />),
      close: <X className="size-3.75" />,
    }}
    // The boards' pill has no close button; a toast leaves by itself (or a swipe).
    toastOptions={{
      unstyled: true,
      closeButtonAriaLabel: translate(locale, "Close notification"),
      classNames: {
        toast: "inset-x-0 mx-auto flex min-h-11 w-fit max-w-full items-center gap-2.5 rounded-full bg-ink py-1.5 pr-2 pl-4.5 font-sans text-[13.5px] font-semibold text-white shadow-[0_10px_24px_rgba(18,32,29,0.25)] dark:bg-surface-raised dark:text-ink dark:ring-1 dark:ring-line",
        content: "flex min-w-0 flex-1 flex-col gap-0.5",
        title: "font-semibold",
        description: "text-small font-normal text-white/70 dark:text-ink-muted",
        actionButton: "h-8 shrink-0 rounded-full bg-white/14 px-3 text-[13px] font-bold text-mint-200 hover:bg-white/20 dark:text-emerald",
        cancelButton: "shrink-0 text-body font-semibold text-white/70 hover:underline dark:text-ink-muted",
        closeButton: "static order-last flex size-7 shrink-0 items-center justify-center rounded-sm border-0 bg-transparent text-white/60 hover:text-white dark:text-ink-muted dark:hover:text-ink",
        icon: "m-0 shrink-0",
      },
    }}
    {...props}
  />
);

export default AppToaster;
