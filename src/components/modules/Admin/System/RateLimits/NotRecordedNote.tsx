"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import Banner from "@/components/smartly/Banner";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const SIGN_INS = "/admin/security/logins";

interface NotRecordedNoteProps {
  // "banner" over the Rate limits tab; "footer" across the foot of the
  // Health page's card.
  variant?: "banner" | "footer";
  className?: string;
}

// The API logs a request only when it goes over a limit (ApiRateLimitLog),
// so the counts here are of blocked requests, not of all traffic. Said
// plainly, with where the sign-in pauses people hit are shown.
const NotRecordedNote = ({ variant = "banner", className }: NotRecordedNoteProps) => {
  const { translate } = useLocale();
  const footer = variant === "footer";
  const text = fillNodes(translate("Only requests that went over a limit are logged here. Paused sign-ins are under {link}."), {
    link: (
      <Link href={SIGN_INS} className={cn("font-semibold underline-offset-2 hover:underline", footer ? "text-emerald" : "underline")}>
        {translate("Security › Sign-ins")}
      </Link>
    ),
  });

  if (footer) {
    return (
      <p role="note" className={cn("flex gap-2 border-t border-line bg-strip px-5 py-3 text-caption leading-relaxed text-ink-2", className)}>
        <Info aria-hidden="true" className="mt-px size-3.5 shrink-0 text-ink-muted" />
        <span>{text}</span>
      </p>
    );
  }
  return (
    <Banner tone="info" inline icon={<Info />} role="note" className={className}>
      {text}
    </Banner>
  );
};

export default NotRecordedNote;
