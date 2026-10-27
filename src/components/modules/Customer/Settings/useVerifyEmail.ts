"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendVerificationEmailAction } from "@/lib/customer/securityActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// "Send a verification email" (Profile and Security): one link to the
// account's address. Says where it went, or why it couldn't go (email isn't
// set up on the server yet). An address verified meanwhile just refreshes.
export function useVerifyEmail() {
  const { t } = useLocale();
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, startSending] = useTransition();

  function send() {
    if (sending) return;
    startSending(async () => {
      const result = await sendVerificationEmailAction();
      if (result.success && result.data?.alreadyVerified) {
        toast.success(t("Your email is verified."));
        router.refresh();
      } else if (result.success && result.data?.sentTo) {
        setSentTo(result.data.sentTo);
        toast.success(t("We sent a link to {email}. Open it to verify your email.", { email: result.data.sentTo }));
      } else if (result.reason === "EMAIL_NOT_CONFIGURED") {
        toast.error(t("Email isn't switched on yet, so we can't send the link. Please try again later."));
      } else {
        toast.error(t(result.message ?? "We couldn't send the verification email. Please try again in a minute."));
      }
    });
  }

  return { send, sending, sentTo };
}
