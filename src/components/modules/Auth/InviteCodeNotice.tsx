"use client";

import { Check, CircleAlert } from "lucide-react";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface InviteCodeNoticeProps {
  code: string;
  // The API said it knows no such code (it would ignore it without a
  // word): say so, rather than "added".
  unknown?: boolean;
  // Opens the invite code field to correct it; left out while sign-up is
  // closed.
  onChange?: () => void;
}

// Under the sign-up fields when an invite code came with it (a ?ref= link),
// as InviteSignupMobile draws it: "Invite code 9AAD7001 added · Change".
const InviteCodeNotice = ({ code, unknown = false, onChange }: InviteCodeNoticeProps) => {
  const { translate } = useLocale();
  const mono = <b className="font-mono font-bold break-all">{code}</b>;

  return (
    <div role="status" className={cn("flex items-center gap-2 rounded-[14px] border px-3 py-2.5 text-[13px] leading-normal", unknown ? "border-warning-line bg-warning-50 text-warning-ink" : "border-emerald-line bg-emerald-soft text-brand-ink")}>
      {unknown ? <CircleAlert className="size-3.75 shrink-0 text-warning" aria-hidden="true" /> : <Check className="size-3.75 shrink-0 text-emerald" strokeWidth={2.5} aria-hidden="true" />}
      <span className="min-w-0 flex-1">{unknown ? <T values={{ code: mono }}>{"Invite code {code} wasn't found. You can still sign up."}</T> : <T values={{ code: mono }}>{"Invite code {code} added"}</T>}</span>
      {onChange && (
        // 44px to tap, without making the strip taller.
        <button type="button" onClick={onChange} className="-my-2 inline-flex min-h-11 shrink-0 items-center rounded-sm px-1 font-semibold underline underline-offset-2">
          {translate("Change")}
        </button>
      )}
    </div>
  );
};

export default InviteCodeNotice;
