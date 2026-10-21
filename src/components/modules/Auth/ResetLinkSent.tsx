"use client";

import { MailCheck, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { AuthFormError } from "./authFormError";
import AuthFooterPrompt from "./AuthFooterPrompt";
import AuthHeading from "./AuthHeading";
import FormErrorCallout from "./FormErrorCallout";

// How long "Send the link again" waits after a link goes out: enough for a
// first email to arrive, and inside the API's 3 requests per 15 minutes.
const RESEND_AFTER_SECONDS = 60;

interface ResetLinkSentProps {
  email: string;
  // The same request again; resolves to the action's answer, or null when
  // the call failed (resendError says why).
  onResend: () => Promise<{ success: boolean } | null>;
  resendError: AuthFormError | null;
  isResending: boolean;
  onUseAnotherEmail: () => void;
}

// What the forgot-password page turns into once the link is requested. The
// heading takes the focus, so the change is heard and the keyboard carries
// on from it.
const ResetLinkSent = ({ email, onResend, resendError, isResending, onUseAnotherEmail }: ResetLinkSentProps) => {
  const { locale, translate } = useLocale();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER_SECONDS);
  const [sentAgain, setSentAgain] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const resend = async () => {
    setSentAgain(false);
    const answer = await onResend();
    if (answer?.success) {
      setSentAgain(true);
      setSecondsLeft(RESEND_AFTER_SECONDS);
    }
  };

  const waiting = secondsLeft > 0;

  return (
    <div className="flex flex-col gap-6">
      <IconTile tone="money" size={48}>
        <MailCheck />
      </IconTile>
      <AuthHeading title="Check your email" focusOnMount />
      <div className="flex flex-col gap-3 text-body-lg text-ink-muted">
        <p>
          {translate("If an account uses this email, a reset link is on its way:")} <span className="font-semibold break-all text-ink">{email}</span>
        </p>
        <p>{translate("The link works for 30 minutes. Check your spam folder if it doesn't arrive.")}</p>
        {/* Each new request ends the links before it (the API supersedes them). */}
        <p>{translate("Only the newest link works.")}</p>
        <p>{translate("Admin passwords are reset by a super admin.")}</p>
      </div>
      <div className="flex flex-col gap-3">
        {/* aria-disabled, not disabled, so the focus stays on it through the
            send and the wait. */}
        <Button
          type="button"
          variant="secondary"
          size="xl"
          className="w-full aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-surface"
          onClick={() => {
            if (!waiting && !isResending) void resend();
          }}
          aria-disabled={waiting || isResending}
          aria-busy={isResending}
        >
          <RefreshCw className={isResending ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden="true" />
          {isResending ? (
            translate("Sending...")
          ) : waiting ? (
            <>
              {/* The ticking count is for the eye; a screen reader hears the
                  button's name once, and that it's unavailable for now. */}
              <span aria-hidden="true">{translate("Send again in {seconds}s", { seconds: formatCount(secondsLeft, locale) })}</span>
              <span className="sr-only">{translate("Send the link again")}</span>
            </>
          ) : (
            translate("Send the link again")
          )}
        </Button>
        {/* In the page from the start, so screen readers announce it; out of
            the layout until there is something to say. */}
        <p role="status" className={cn("text-small text-brand-ink", !sentAgain && "sr-only")}>
          {sentAgain ? translate("Sent again. Use the link in the newest email.") : ""}
        </p>
        <FormErrorCallout error={resendError} />
        <Button type="button" variant="ghost" size="xl" className="w-full" onClick={onUseAnotherEmail}>
          {translate("Use a different email")}
        </Button>
      </div>
      <AuthFooterPrompt prompt="Remembered it?" linkLabel="Back to sign in" href={LOGIN_ROUTE} />
    </div>
  );
};

export default ResetLinkSent;
