"use client";

import { LinkIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FORGOT_PASSWORD_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthHeading from "./AuthHeading";

// /reset-password opened without its token -- usually a link cut short by
// an email client.
const IncompleteResetLink = () => {
  const { translate } = useLocale();

  return (
    <div className="space-y-6">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <LinkIcon className="size-6" aria-hidden="true" />
      </span>
      <AuthHeading title="This reset link is incomplete" subtitle="Open the link from the email again, or request a new one." />
      <Button asChild className="h-10 w-full">
        <Link href={FORGOT_PASSWORD_ROUTE}>{translate("Request a new link")}</Link>
      </Button>
    </div>
  );
};

export default IncompleteResetLink;
