"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Shield, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { forgetMyTrustedDeviceAction } from "@/app/(dashboardLayout)/admin/account/_action";
import { relativeDayLabel } from "@/components/modules/Admin/Dashboard/dashboardDates";
import FormDialog from "@/components/shared/dialog/FormDialog";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatDate } from "@/lib/date";
import { deviceLabelText } from "@/lib/deviceLabel";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { myTwoStepQuery } from "@/queries/myAccount.queries";
import { lowerFirst } from "@/lib/text";
import type { IAdminUser } from "@/types/auth.types";
import ChangeOwnPasswordForm from "./ChangeOwnPasswordForm";
import { BackupCodesDialog, TwoStepOffDialog, TwoStepSetupDialog } from "./TwoStepDialogs";

// When the password was last set, and the dialog that changes it. An admin
// who signs in with Google has none to change: changing one needs the
// current one, so they're told who can set one instead.
export const PasswordCard = ({ me }: { me: IAdminUser }) => {
  const { translate, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const changedAt = me.passwordChangedAt ?? null;

  return (
    <Card padding="none" className="flex flex-wrap items-center gap-3.5 px-5 py-4.5">
      <IconTile size={40} tone="neutral">
        <KeyRound />
      </IconTile>
      <div className="flex min-w-0 grow basis-48 flex-col gap-0.5">
        <h2 className="text-[15px] leading-[normal] font-semibold text-ink">
          <T>Password</T>
        </h2>
        {changedAt ? (
          <span className="text-small text-ink-muted">{translate("Changed {when}", { when: lowerFirst(relativeDayLabel(changedAt, locale, { t: translate })) })}</span>
        ) : (
          <>
            <span className="text-small text-ink-muted">
              <T>None yet: you sign in with Google</T>
            </span>
            {/* Nobody resets their own password from Security, so a super admin needs another one. */}
            <span className="text-small text-ink-muted">
              <T>{me.role === "SUPER_ADMIN" ? "Ask another super admin to set one in Security › Admin team." : "Ask a super admin to set one in Security › Admin team."}</T>
            </span>
          </>
        )}
      </div>
      {changedAt && (
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title="Change password"
          description={me.email}
          size="sm"
          trigger={
            <Button variant="secondary" size="sm" className="h-9 pointer-coarse:h-11">
              <T>Change password</T>
            </Button>
          }
        >
          <ChangeOwnPasswordForm onDone={() => setOpen(false)} />
        </FormDialog>
      )}
    </Card>
  );
};

// English or বাংলা for the panel, the same switch as the top bar's.
export const LanguageCard = () => {
  const { locale, toggleLocale, translate } = useLocale();

  return (
    <Card padding="none" className="flex flex-wrap items-center justify-between gap-3.5 px-5 py-4.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] leading-[normal] font-semibold text-ink">
          <T>Language</T>
        </h2>
        <span className="text-small text-ink-muted">
          <T>For the admin panel only</T>
        </span>
      </div>
      {/* The board's pill: two 96px halves on the sunken grey, the open one white. */}
      <div role="group" aria-label={translate("Language")} className="grid grid-cols-[repeat(2,6rem)] gap-0.5 rounded-full bg-surface-sunken p-0.75">
        {(
          [
            { value: "en", label: "English" },
            { value: "bn", label: "বাংলা" },
          ] as const
        ).map((option) => {
          const on = option.value === locale;
          return (
            <button
              key={option.value}
              type="button"
              lang={option.value}
              aria-pressed={on}
              onClick={() => {
                if (!on) toggleLocale();
              }}
              className={cn(
                "h-8 rounded-full whitespace-nowrap transition-colors pointer-coarse:h-11",
                option.value === "bn" ? "font-bn text-body" : "text-small",
                on ? "bg-surface font-semibold text-ink shadow-button" : "font-normal text-ink-soft hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
};

// Two-step sign-in for your own account (admin/auth/two-step), as the
// AdminMyAccount board draws it: off, an amber card that says why and "Set
// it up"; on, since when, the backup codes left, new codes, Turn off (not
// while a super admin requires it for everyone) and the computers that
// skip the code for 30 days.
export const TwoStepCard = ({ me }: { me: IAdminUser }) => {
  const { translate, locale } = useLocale();
  const client = useQueryClient();
  const query = useQuery(myTwoStepQuery());
  const status = query.data?.data;
  const [dialog, setDialog] = useState<"setup" | "codes" | "off" | null>(null);
  const forget = useActionMutation<string | null, unknown>({
    action: (id: string | null) => forgetMyTrustedDeviceAction(id),
    successMessage: "That computer will ask for a code again.",
    invalidateKeys: [queryKeys.myAccount.all],
    refreshRoute: false,
  });
  const changed = () => void client.invalidateQueries({ queryKey: queryKeys.myAccount.all });
  const on = status ? status.enabled : me.twoFactorEnabled === true;
  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <Card padding="none" className={cn("flex flex-col gap-3 px-5 py-4.5", !on && "border-warning-line bg-warning-50")}>
      <div className="flex flex-wrap items-center gap-3">
        <IconTile size={40} tone={on ? "money" : "warning"}>
          {on ? <ShieldCheck /> : <Shield />}
        </IconTile>
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <h2 className="text-[15px] leading-[normal] font-semibold text-ink">
            <T>Two-step verification</T>
          </h2>
          <span className={cn("text-small font-semibold", on ? "text-emerald" : "text-warning")}>
            {on ? (status?.enabledAt ? translate("On since {date}", { date: formatDate(status.enabledAt, "d MMM yyyy", "—", locale) }) : translate("On")) : translate("Off")}
          </span>
        </div>
        {!on && (
          <Button variant="action" size="sm" className="h-9 px-4 pointer-coarse:h-11" disabled={query.isPending && !status} onClick={() => setDialog("setup")}>
            <T>Set it up</T>
          </Button>
        )}
      </div>
      {on ? (
        <>
          <p className="text-[13.5px] leading-[1.5] text-ink-soft">
            {status
              ? plural(translate, status.backupCodesLeft, "{count} backup code left.", "{count} backup codes left.", undefined, locale)
              : translate("Signing in asks for a code from your authenticator app.")}{" "}
            {status?.required && translate("A super admin requires it for every admin, so it stays on.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="pointer-coarse:h-11" onClick={() => setDialog("codes")}>
              <KeyRound className="text-ink-2" aria-hidden="true" />
              <T>New backup codes</T>
            </Button>
            {!status?.required && (
              <Button variant="secondary" size="sm" className="border-expense-line text-expense hover:bg-expense-soft pointer-coarse:h-11" onClick={() => setDialog("off")}>
                <T>Turn off</T>
              </Button>
            )}
          </div>
          {status && status.trustedDevices.length > 0 && (
            <div className="flex flex-col border-t border-divider pt-3">
              <div className="flex items-center justify-between gap-3 pb-1">
                <span className="text-small font-semibold text-ink">
                  <T>Computers that skip the code</T>
                </span>
                {status.trustedDevices.length > 1 && (
                  <button type="button" disabled={forget.isPending} onClick={() => void forget.run(null)} className="text-small font-semibold text-emerald hover:underline disabled:opacity-60">
                    <T>Forget all</T>
                  </button>
                )}
              </div>
              <ul>
                {status.trustedDevices.map((device) => (
                  <li key={device.id} className="flex items-center gap-3 py-2 text-small">
                    <span className="flex min-w-0 grow flex-col">
                      <span className="truncate font-semibold text-ink">
                        {deviceLabelText(device.deviceLabel, translate)}
                        {device.current && ` · ${translate("this computer")}`}
                      </span>
                      <span className="truncate text-caption text-ink-muted tabular-nums">
                        {[device.place, device.ipAddress, translate("until {date}", { date: formatDate(device.expiresAt, "d MMM", "—", locale) })].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <Button variant="ghost" size="xs" disabled={forget.isPending} onClick={() => void forget.run(device.id)} className="pointer-coarse:h-11">
                      <T>Forget</T>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-[13.5px] leading-[1.5] text-ink-soft">
          {me.role === "SUPER_ADMIN" && (
            <>
              <T>Super admins can change everything, so a stolen password would be costly.</T>{" "}
            </>
          )}
          <T>Turn on two-step sign-in with an authenticator app. You get 10 backup codes in case you lose your phone.</T>
        </p>
      )}
      <TwoStepSetupDialog open={dialog === "setup"} onOpenChange={close} email={me.email} onChanged={changed} />
      <BackupCodesDialog open={dialog === "codes"} onOpenChange={close} email={me.email} onChanged={changed} />
      <TwoStepOffDialog open={dialog === "off"} onOpenChange={close} onChanged={changed} />
    </Card>
  );
};
