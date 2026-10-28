"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import Banner from "@/components/smartly/Banner";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const SIGN_INS = "/admin/security/logins";

// The API logs a request only when it goes over a limit (ApiRateLimitLog),
// so the counts here are of blocked requests, not of all traffic. Said
// plainly over the Rate limits tab, with where the sign-in pauses people
// hit are shown.
const NotRecordedNote = ({ className }: { className?: string }) => {
  const { translate } = useLocale();
  return (
    <Banner tone="info" inline icon={<Info />} role="note" className={className}>
      {fillNodes(translate("Only requests that went over a limit are logged here. Paused sign-ins are under {link}."), {
        link: (
          <Link href={SIGN_INS} className="font-semibold underline underline-offset-2 hover:underline">
            {translate("Security › Sign-ins")}
          </Link>
        ),
      })}
    </Banner>
  );
};

export default NotRecordedNote;
