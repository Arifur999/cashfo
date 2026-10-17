"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Card from "@/components/smartly/Card";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Button } from "@/components/ui/button";
import { formatRelativeDay } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { lowerFirst } from "@/lib/text";
import type { IAdminUser } from "@/types/auth.types";
import ChangeOwnPasswordForm from "./ChangeOwnPasswordForm";

const OUTLINE = "h-9 border-line-strong bg-surface px-4 font-semibold text-ink hover:bg-surface-sunken";

// When the password was last set, and the dialog that changes it.
export const PasswordCard = ({ me }: { me: IAdminUser }) => {
  const [open, setOpen] = useState(false);

  return (
    <Card className="flex flex-wrap items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
        <KeyRound aria-hidden="true" className="size-4.5" />
      </span>
      <span className="flex grow flex-col gap-0.5">
        <h2 className="text-title text-ink">Password</h2>
        <span className="text-small text-ink-muted">
          {me.passwordChangedAt ? `Changed ${lowerFirst(formatRelativeDay(me.passwordChangedAt))}` : "None yet: you sign in with Google"}
        </span>
      </span>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Change password"
        description={me.email}
        size="sm"
        trigger={
          <Button type="button" variant="outline" className={OUTLINE}>
            Change password
          </Button>
        }
      >
        <ChangeOwnPasswordForm onDone={() => setOpen(false)} />
      </FormDialog>
    </Card>
  );
};

// English or বাংলা for the panel, the same switch as the top bar's.
export const LanguageCard = () => {
  const { locale, toggleLocale } = useLocale();

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex flex-col gap-0.5">
        <h2 className="text-title text-ink">Language</h2>
        <span className="text-small text-ink-muted">For the admin panel only</span>
      </span>
      <SegmentedControl
        label="Language"
        value={locale}
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
// look, switched off, until the backend has it.
export const TwoStepCard = ({ me }: { me: IAdminUser }) => (
  <Card className="flex flex-col gap-3 bg-cream">
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning">
        <ShieldCheck aria-hidden="true" className="size-4.5" />
      </span>
      <span className="flex grow flex-col gap-0.5">
        <h2 className="text-title text-ink">Two-step verification</h2>
        <span className="text-small font-semibold text-warning">Off</span>
      </span>
      <Button type="button" disabled title="Coming soon" className="h-9 bg-emerald px-4 font-semibold">
        Set it up
      </Button>
    </div>
    <p className="text-body leading-normal text-ink-2">
      {me.role === "SUPER_ADMIN" ? "Super admins can change everything, so a stolen password would be costly. " : ""}
      Two-step sign-in with an authenticator app is coming: you will get 10 backup codes in case you lose your phone.
    </p>
  </Card>
);
