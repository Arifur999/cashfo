"use client";

import { Gift } from "lucide-react";
import T from "@/components/shared/T";
import Banner from "@/components/smartly/Banner";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface InviteCodeNoticeProps {
  code: string;
  // Opens the invite code field to correct it; left out while sign-up is
  // closed.
  onChange?: () => void;
}

// Above the sign-up form when an invite code came with it (a ?ref= link).
// It says "signing up with", not "applied": the API only credits a code it
// knows, and ignores any other without a word.
const InviteCodeNotice = ({ code, onChange }: InviteCodeNoticeProps) => {
  const { translate } = useLocale();

  return (
    <Banner tone="mint" inline icon={<Gift />} className="items-center font-normal">
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 break-all">
          <T values={{ code: <span className="font-mono font-medium">{code}</span> }}>{"Signing up with invite code {code}"}</T>
        </span>
        {onChange && (
          // 44px to tap, without making the banner taller.
          <button type="button" onClick={onChange} className="-my-2 inline-flex min-h-11 items-center rounded-sm px-1 font-semibold underline-offset-2 hover:underline">
            {translate("Change")}
          </button>
        )}
      </span>
    </Banner>
  );
};

export default InviteCodeNotice;
