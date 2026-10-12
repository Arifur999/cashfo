"use client";

import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthHeading from "./AuthHeading";

interface ResetLinkSentProps {
  email: string;
  onUseAnotherEmail: () => void;
}

// What the forgot-password page turns into once the link is requested.
const ResetLinkSent = ({ email, onUseAnotherEmail }: ResetLinkSentProps) => {
  const { translate } = useLocale();

  return (
    <div role="status" className="space-y-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-dark dark:text-brand-primary">
        <MailCheck className="size-6" aria-hidden="true" />
      </span>
      <AuthHeading title="Check your email" />
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          {translate("If an account uses this email, a reset link is on its way:")}{" "}
          <span className="font-medium break-all text-foreground">{email}</span>
        </p>
        <p>{translate("The link works for 30 minutes. Check your spam folder if it doesn't arrive.")}</p>
        <p>{translate("Admin passwords are reset by a super admin.")}</p>
      </div>
      <Button type="button" variant="outline" className="h-10 w-full" onClick={onUseAnotherEmail}>
        {translate("Use a different email")}
      </Button>
    </div>
  );
};

export default ResetLinkSent;
