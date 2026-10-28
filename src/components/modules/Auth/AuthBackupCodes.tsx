"use client";

import { ArrowRight, Copy, Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import { getAppToday } from "@/lib/date";
import { backupCodesFile } from "@/lib/customer/securityDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthHeading from "./AuthHeading";

interface AuthBackupCodesProps {
  codes: string[];
  email: string;
  // Where "Continue" goes: the account is signed in already.
  destination: string;
  admin?: boolean;
}

// The ten backup codes, shown once, after two-step is turned on while
// signing in (an admin's set-up, an accepted invite): copy or download them,
// then go on.
const AuthBackupCodes = ({ codes, email, destination, admin = false }: AuthBackupCodesProps) => {
  const { t } = useLocale();

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success(t("Backup codes copied"));
    } catch {
      toast.error(t("Couldn't copy. Select the text and copy it yourself."));
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([backupCodesFile(codes, email, getAppToday())], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "smartly-backup-codes.txt";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <>
      <AuthHeading admin={admin} focusOnMount title="Save your backup codes" subtitle="Two-step sign-in is on. These codes get you in if you lose your phone." />
      <div className="flex items-start gap-2.5 rounded-field border border-warning-line bg-warning-50 px-3.5 py-3 text-small leading-normal text-warning-ink">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t("Keep these somewhere safe, away from your phone. If you lose it, each code lets you sign in once. They won't be shown again.")}</span>
      </div>
      {/* Latin letters on purpose: the codes are typed exactly as shown. */}
      <ol lang="en" aria-label={t("Backup codes")} className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-line bg-surface px-4 py-3.5 font-mono text-body font-semibold tracking-wider text-ink">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => void copyAll()} className="pointer-coarse:h-11">
          <Copy aria-hidden="true" />
          {t("Copy all")}
        </Button>
        <Button variant="secondary" size="sm" onClick={download} className="pointer-coarse:h-11">
          <Download aria-hidden="true" />
          {t("Download")}
        </Button>
      </div>
      {/* A full load: the signed-in side has its own layout and data. */}
      <Button size="lg" className="w-full text-[15px]" onClick={() => window.location.assign(destination)}>
        {t(admin ? "Continue to the admin panel" : "Continue")}
        <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />
      </Button>
    </>
  );
};

export default AuthBackupCodes;
