"use client";

import { Link2Off } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
import { FORGOT_PASSWORD_ROUTE, LOGIN_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthFooterPrompt from "./AuthFooterPrompt";
import AuthHeading from "./AuthHeading";

const COPY = {
  // Opened without its token -- usually a link cut short by an email client.
  incomplete: { title: "This reset link is incomplete", subtitle: "Open the link from the email again, or request a new one." },
  // The API says the link can't be used: older than 30 minutes, used
  // already, or replaced by a newer one.
  expired: { title: "This reset link no longer works", subtitle: "A link lasts 30 minutes, works once, and only the newest one works. Request a new link and open it from the latest email." },
} as const;

// What /reset-password shows instead of the form when its link can't work.
// Opened from an email, there may be no page to go back to, so it offers
// the way to sign in too.
const ResetLinkProblem = ({ reason }: { reason: keyof typeof COPY }) => {
  const { translate } = useLocale();

  return (
    <div className="flex flex-col gap-6">
      <IconTile tone="expense" size={48}>
        <Link2Off />
      </IconTile>
      <AuthHeading title={COPY[reason].title} subtitle={COPY[reason].subtitle} />
      <Button size="xl" className="w-full" asChild>
        <Link href={FORGOT_PASSWORD_ROUTE}>{translate("Request a new link")}</Link>
      </Button>
      <AuthFooterPrompt prompt="Remembered it?" linkLabel="Back to sign in" href={LOGIN_ROUTE} />
    </div>
  );
};

export default ResetLinkProblem;
