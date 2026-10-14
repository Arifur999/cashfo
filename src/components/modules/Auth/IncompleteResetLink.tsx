"use client";

import { Link2Off } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import IconTile from "@/components/smartly/IconTile";
import { FORGOT_PASSWORD_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthHeading from "./AuthHeading";

// /reset-password opened without its token -- usually a link cut short by
// an email client.
const IncompleteResetLink = () => {
  const { translate } = useLocale();

  return (
    <div className="flex flex-col gap-6">
      <IconTile tone="expense" size={48}>
        <Link2Off />
      </IconTile>
      <AuthHeading title="This reset link is incomplete" subtitle="Open the link from the email again, or request a new one." />
      <Button size="xl" className="w-full" asChild>
        <Link href={FORGOT_PASSWORD_ROUTE}>{translate("Request a new link")}</Link>
      </Button>
    </div>
  );
};

export default IncompleteResetLink;
