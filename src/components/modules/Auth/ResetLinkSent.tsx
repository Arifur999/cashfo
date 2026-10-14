"use client";

import { MailCheck } from "lucide-react";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
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
    <div role="status" className="flex flex-col gap-6">
      <IconTile tone="money" size={48}>
        <MailCheck />
      </IconTile>
      <AuthHeading title="Check your email" />
      <div className="flex flex-col gap-3 text-body-lg text-ink-muted">
        <p>
          {translate("If an account uses this email, a reset link is on its way:")} <span className="font-semibold break-all text-ink">{email}</span>
        </p>
        <p>{translate("The link works for 30 minutes. Check your spam folder if it doesn't arrive.")}</p>
        <p>{translate("Admin passwords are reset by a super admin.")}</p>
      </div>
      <Button type="button" variant="secondary" size="xl" className="w-full" onClick={onUseAnotherEmail}>
        {translate("Use a different email")}
      </Button>
    </div>
  );
};

export default ResetLinkSent;
