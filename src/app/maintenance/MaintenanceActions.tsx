"use client";

import { LogOut, Mail, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { logoutAction } from "@/app/-actions/authActions";
import Button from "@/components/smartly/Button";
import { formatDate } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// How often an open, visible tab asks again on its own. The API's
// Retry-After is longer; this page only reads the open /api/platform.
const RECHECK_EVERY_MS = 60_000;

interface MaintenanceActionsProps {
  supportEmail: string;
  // A signed-in visitor can't reach the sign-in page from here (it is for
  // guests, and the app sends them back), so they get their own way out --
  // to switch account, or for an admin to sign in and switch this off.
  signedIn: boolean;
}

// "Check again" re-renders the page in place: once maintenance is off, the
// page itself sends the visitor home. Until then it says when it last
// looked, and keeps looking every minute while the tab is in view.
export default function MaintenanceActions({ supportEmail, signedIn }: MaintenanceActionsProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [checking, startCheck] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const lastCheck = useRef(0);

  const check = useCallback(() => {
    lastCheck.current = Date.now();
    // In one transition, so "Checked at" changes when the fresh page does.
    startCheck(() => {
      setCheckedAt(new Date());
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const timer = window.setInterval(() => {
      if (visible()) check();
    }, RECHECK_EVERY_MS);
    // Back in view after a while away: look at once rather than wait.
    const onVisibility = () => {
      if (visible() && Date.now() - lastCheck.current >= RECHECK_EVERY_MS) check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [check]);

  // "4:05 PM", or "৪:০৫ অপরাহ্ণ" with the dictionary's am/pm words.
  const time = checkedAt ? (locale === "bn" ? `${toLocaleDigits(formatDate(checkedAt, "h:mm"), locale)} ${t(formatDate(checkedAt, "a").toLowerCase())}` : formatDate(checkedAt, "h:mm a")) : "";
  const status = checkedAt && !checking ? t("Still under maintenance. Checked at {time}.", { time }) : "";

  return (
    <>
      {/* aria-disabled, not disabled: the minute's own check would otherwise
          take the focus off a button the keyboard is resting on. */}
      <Button size="xl" onClick={() => !checking && check()} aria-disabled={checking} aria-busy={checking}>
        <RefreshCw className={checking ? "animate-spin motion-reduce:animate-none" : undefined} />
        {t(checking ? "Checking again..." : "Check again")}
      </Button>
      {supportEmail && (
        <Button size="xl" variant="secondary" asChild>
          <a href={`mailto:${supportEmail}`}>
            <Mail />
            {t("Write to support")}
          </a>
        </Button>
      )}
      {signedIn && (
        <Button size="xl" variant="ghost" onClick={() => startSignOut(() => logoutAction())} disabled={signingOut} aria-busy={signingOut}>
          <LogOut />
          {t("Sign out")}
        </Button>
      )}
      {/* A row of its own under the buttons once there is something to say,
          and in the page from the start, so each check is heard. */}
      <p aria-live="polite" className={cn("basis-full text-small text-ink-muted", !status && "sr-only")}>
        {status}
      </p>
    </>
  );
}
