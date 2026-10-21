"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { relativeDayLabel } from "@/components/modules/Admin/Dashboard/dashboardDates";
import FormDialog from "@/components/shared/dialog/FormDialog";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import IconTile from "@/components/smartly/IconTile";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { lowerFirst } from "@/lib/text";
import type { IAdminUser } from "@/types/auth.types";
import ChangeOwnPasswordForm from "./ChangeOwnPasswordForm";

// When the password was last set, and the dialog that changes it. An admin
// who signs in with Google has none to change: changing one needs the
// current one, so they're told who can set one instead.
export const PasswordCard = ({ me }: { me: IAdminUser }) => {
  const { translate, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const changedAt = me.passwordChangedAt ?? null;

  return (
    <Card className="flex flex-wrap items-center gap-3">
      <IconTile size={40} tone="neutral">
        <KeyRound />
      </IconTile>
      <div className="flex min-w-0 grow basis-48 flex-col gap-0.5">
        <h2 className="text-title text-ink">
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
            <Button variant="secondary" size="sm" className="pointer-coarse:h-11">
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
  const { locale, toggleLocale } = useLocale();

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-title text-ink">
          <T>Language</T>
        </h2>
        <span className="text-small text-ink-muted">
          <T>For the admin panel only</T>
        </span>
      </div>
      <SegmentedControl
        label="Language"
        value={locale}
        size="coarse"
        onChange={(next) => {
          if (next !== locale) toggleLocale();
        }}
        options={[
          { value: "en", label: "English" },
          { value: "bn", label: "বাংলা", lang: "bn" },
        ]}
        className="grid grid-cols-2 [&>button]:w-24"
      />
    </Card>
  );
};

// Two-step sign-in is a NEW item in the design notes: shown as it will
// look, switched off and marked as coming, until the backend has it.
export const TwoStepCard = ({ me }: { me: IAdminUser }) => (
  <Card className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-3">
      <IconTile size={40} tone="neutral">
        <ShieldCheck />
      </IconTile>
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <h2 className="text-title text-ink">
          <T>Two-step verification</T>
        </h2>
        <span className="text-small font-semibold text-ink-muted">
          <T>Off</T>
        </span>
      </div>
      <Chip tone="neutral" size="sm">
        <T>Coming soon</T>
      </Chip>
    </div>
    <p className="text-body leading-normal text-ink-2">
      {me.role === "SUPER_ADMIN" && (
        <>
          <T>Super admins can change everything, so a stolen password would be costly.</T>{" "}
        </>
      )}
      <T>Two-step sign-in with an authenticator app is coming: you will get 10 backup codes in case you lose your phone.</T>
    </p>
  </Card>
);
