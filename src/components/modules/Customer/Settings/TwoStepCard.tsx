"use client";

import { KeyRound, Laptop, Mail, Shield, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { formatDate, formatTimeAgo } from "@/lib/customer/date";
import { getTwoStepStatusAction, removeAllTrustedDevicesAction, removeTrustedDeviceAction } from "@/lib/customer/securityActions";
import type { TwoStepStatus } from "@/lib/customer/securityDisplay";
import { knownIp } from "@/lib/customer/settingsDisplay";
import { deviceLabelText } from "@/lib/deviceLabel";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DisableTwoStepDialog, RegenerateCodesDialog, TwoStepSetupDialog } from "./TwoStepDialogs";

const BACKUP_CODES = 10;

// A method row's square: the board's 36px strip-grey tile with a line.
const METHOD_TILE = "flex size-9 shrink-0 items-center justify-center rounded-field border border-line bg-strip text-ink-soft [&_svg]:size-4";
const ROW = "flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-divider px-4 py-3.5 md:px-5.5";

interface TwoStepCardProps {
  // Read by the page; null when it couldn't be read (the card offers Try again).
  initialStatus: TwoStepStatus | null;
}

// Two-step sign-in (design-v4 SettingsSecurity): the authenticator app,
// and once it is on, the backup codes and the computers that skip the code.
// Code by email waits for email to be switched on.
export function TwoStepCard({ initialStatus }: TwoStepCardProps) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const readOnly = Boolean(user.impersonatedBy);
  const [status, setStatus] = useState(initialStatus);
  const [reading, setReading] = useState(false);
  const [dialog, setDialog] = useState<"setup" | "codes" | "off" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const enabled = status ? status.enabled : Boolean(user.twoFactorEnabled);

  // On or off: the card reads its state again, and the page (the phone
  // menu's "2-step on") follows.
  function changed() {
    void read();
    router.refresh();
  }

  async function read() {
    setReading(true);
    try {
      const result = await getTwoStepStatusAction();
      if (result.success && result.data) setStatus(result.data);
    } catch {
      // Still unread: Try again stays.
    } finally {
      setReading(false);
    }
  }

  function remove(id: string | null) {
    setBusyId(id ?? "all");
    startTransition(async () => {
      const result = id ? await removeTrustedDeviceAction(id) : await removeAllTrustedDevicesAction();
      setBusyId(null);
      if (result.success) {
        setStatus((current) => (current ? { ...current, trustedDevices: id ? current.trustedDevices.filter((device) => device.id !== id) : [] } : current));
        toast.success(t(id ? "That computer will ask for a code again." : "Every computer will ask for a code again."));
      } else {
        toast.error(t(result.message ?? "Couldn't remove that computer"));
      }
    });
  }

  const devices = status?.trustedDevices ?? [];
  const codesLeft = status?.backupCodesLeft ?? 0;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-start gap-3.5 px-4 pt-4.5 pb-3.5 md:px-5.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-warning-soft text-warning [&_svg]:size-5">
          <Shield aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="flex flex-wrap items-center gap-2 text-title font-semibold text-ink">
            {t("Two-step sign-in")}
            <Chip tone={enabled ? "income" : "neutral"} className="h-4.5 px-2 text-[11.5px]">
              {t(enabled ? "On@@switch" : "Off@@switch")}
            </Chip>
          </h2>
          <span className="text-small leading-normal text-ink-muted">{t("Ask for a second code when you sign in, so a stolen password alone isn't enough.")}</span>
        </span>
      </div>

      <div className={ROW}>
        <span className={METHOD_TILE}>
          <Smartphone aria-hidden="true" />
        </span>
        <span className="flex min-w-48 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
            {t("Authenticator app")}
            {enabled ? (
              <Chip tone="income" size="sm">
                {status?.enabledAt ? t("On since {date}", { date: formatDate(status.enabledAt, "d MMM yyyy", locale) }) : t("On@@switch")}
              </Chip>
            ) : (
              <Chip tone="mint" size="sm">
                {t("Recommended")}
              </Chip>
            )}
          </span>
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Google Authenticator, Microsoft Authenticator or a similar app makes a new 6-digit code every 30 seconds. Works without internet.")}</span>
        </span>
        {enabled ? (
          <Button variant="secondary" size="sm" onClick={() => setDialog("off")} disabled={readOnly} className="text-[13.5px] pointer-coarse:h-11">
            {t("Turn off")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setDialog("setup")} disabled={readOnly} className="text-[13.5px] pointer-coarse:h-11">
            {t("Set up")}
          </Button>
        )}
      </div>

      {enabled && status && (
        <>
          <div className={ROW}>
            <span className={METHOD_TILE}>
              <KeyRound aria-hidden="true" />
            </span>
            <span className="flex min-w-48 flex-1 flex-col gap-0.5">
              <span className="text-body font-semibold text-ink">{t("Backup codes")}</span>
              <span className={cn("text-[12.5px] leading-[1.45]", codesLeft <= 3 ? "text-warning" : "text-ink-muted")}>
                {t("{left} of {total} left. Each one gets you in once if you lose your phone.", { left: formatCount(codesLeft, locale), total: formatCount(BACKUP_CODES, locale) })}
              </span>
            </span>
            <Button variant="secondary" size="sm" onClick={() => setDialog("codes")} disabled={readOnly} className="text-[13.5px] pointer-coarse:h-11">
              {t("Make new codes")}
            </Button>
          </div>

          <div className="flex flex-col border-t border-divider">
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-3.5 md:px-5.5">
              <span className={METHOD_TILE}>
                <Laptop aria-hidden="true" />
              </span>
              <span className="flex min-w-48 flex-1 flex-col gap-0.5">
                <span className="text-body font-semibold text-ink">{t("Computers that skip the code")}</span>
                <span className="text-[12.5px] leading-[1.45] text-ink-muted">{devices.length === 0 ? t("None. When you tick 'Trust this computer' at sign-in, it skips the code for 30 days.") : t("These skip the code for 30 days after you trusted them.")}</span>
              </span>
              {devices.length > 1 && (
                <Button variant="secondary" size="sm" onClick={() => remove(null)} disabled={isPending || readOnly} className="border-expense-line text-[13px] text-expense hover:bg-expense-soft pointer-coarse:h-11">
                  {busyId === "all" && <Loader size={14} />}
                  {t("Remove all")}
                </Button>
              )}
            </div>
            {devices.length > 0 && (
              <ul className="flex flex-col pb-2">
                {devices.map((device) => {
                  const ip = knownIp(device.ipAddress);
                  const label = deviceLabelText(device.deviceLabel, t);
                  return (
                    <li key={device.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 pr-4 pl-17 md:pr-5.5 md:pl-19">
                      <span className="flex min-w-40 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2 text-small font-semibold text-ink">
                          {label}
                          {device.current && (
                            <Chip tone="mint" size="sm">
                              {t("This computer")}
                            </Chip>
                          )}
                        </span>
                        <span className="text-caption text-ink-muted tabular-nums">
                          {[device.place, ip && t("IP {ip}", { ip }), t("Last used {when}", { when: formatTimeAgo(device.lastUsedAt, t, locale) })].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <Button variant="secondary" size="xs" onClick={() => remove(device.id)} disabled={isPending || readOnly} aria-label={t("Remove {device}", { device: label })} className="pointer-coarse:h-11">
                        {busyId === device.id && <Loader size={12} />}
                        {t("Remove")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Not ready yet: only the button is set back, the words stay readable. */}
      <div className={cn(ROW, "opacity-60")}>
        <span className={METHOD_TILE}>
          <Mail aria-hidden="true" />
        </span>
        <span className="flex min-w-48 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
            {t("Code by email")}
            <Chip tone="neutral" size="sm">
              {t("Coming soon")}
            </Chip>
          </span>
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("A code is sent to your email each time you sign in.")}</span>
        </span>
        <Button variant="outline" size="sm" disabled className="text-[13.5px] text-ink-faint">
          {t("Set up")}
        </Button>
      </div>

      {status === null && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-warning-50 px-4 py-3 text-small text-warning-ink md:px-5.5">
          {t("Couldn't load your two-step settings.")}
          <Button variant="secondary" size="xs" onClick={() => void read()} disabled={reading}>
            {reading && <Loader size={12} />}
            {t("Try again")}
          </Button>
        </div>
      )}

      <TwoStepSetupDialog open={dialog === "setup"} onClose={() => setDialog(null)} onEnabled={changed} />
      <RegenerateCodesDialog open={dialog === "codes"} onClose={() => setDialog(null)} onDone={changed} />
      <DisableTwoStepDialog open={dialog === "off"} onClose={() => setDialog(null)} onDone={changed} />
    </Card>
  );
}
