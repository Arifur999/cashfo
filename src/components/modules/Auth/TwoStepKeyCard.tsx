"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { QrCode } from "@/components/modules/Customer/Settings/QrCode";
import Input from "@/components/smartly/form/Input";
import { cleanTotpCode, groupSecret } from "@/lib/customer/securityDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// The key for the authenticator app (AdminInviteAccept, step 3): its QR
// code, drawn here in the browser, and the same key as text to type by
// hand, with a copy button.
export const TwoStepKeyCard = ({ secret, otpauthUrl }: { secret: string; otpauthUrl: string }) => {
  const { t } = useLocale();

  const copy = async () => {
    if (await copyText(secret.replace(/\s+/g, ""))) toast.success(t("Key copied"));
    else toast.error(t("Couldn't copy. Select the text and copy it yourself."));
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line-card bg-surface p-4 shadow-card sm:flex-row sm:items-start">
      <QrCode value={otpauthUrl} size={134} label={t("QR code for your authenticator app")} />
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-body font-semibold text-ink">{t("Scan with your authenticator app")}</span>
        <span className="text-small leading-[1.5] text-ink-muted">{t("Google Authenticator, Microsoft Authenticator or any app that shows 6-digit codes.")}</span>
        <span className="text-caption text-ink-muted">{t("Can't scan? Type this key:")}</span>
        <span className="flex items-center gap-2">
          <code lang="en" className="rounded-md bg-strip px-2 py-1 font-mono text-caption font-semibold tracking-[0.08em] break-all text-ink">
            {groupSecret(secret)}
          </code>
          <button type="button" onClick={() => void copy()} aria-label={t("Copy the key")} className="flex size-7.5 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:bg-surface-sunken pointer-coarse:size-11">
            <Copy className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
  );
};

// "Code from the app": one 44px field, the digits spaced out.
export const TotpCodeField = ({ id, value, onChange, invalid }: { id: string; value: string; onChange: (value: string) => void; invalid?: boolean }) => {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-medium text-ink">
        {t("Code from the app")}
      </label>
      <Input
        id={id}
        size="auth"
        value={value}
        onChange={(event) => onChange(cleanTotpCode(event.target.value))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        invalid={invalid}
        lang="en"
        className="font-semibold tracking-[0.2em] tabular-nums placeholder:font-normal"
      />
    </div>
  );
};
