"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { changePasswordAction } from "@/lib/customer/authActions";
import { passwordProblem } from "@/lib/customer/groupAccess";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PopupDialog } from "../Shared/PopupDialog";

// A group member's own password (the GroupHeader board's Change password,
// for a member-portal login): the current one, the new one twice. The API
// checks the current password and signs the login's other devices out.
export function MemberPasswordDialog({ open, onClose, who }: { open: boolean; onClose: () => void; who: string }) {
  const { t } = useLocale();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const close = () => {
    if (isPending) return;
    setCurrent("");
    setNext("");
    setAgain("");
    setError(null);
    onClose();
  };

  function save() {
    if (!current) return setError(t("Enter your current password."));
    const problem = passwordProblem(next, again);
    if (problem) return setError(t(problem));
    if (next === current) return setError(t("Pick a password different from the current one."));
    startTransition(async () => {
      const result = await attempt(() => changePasswordAction({ currentPassword: current, newPassword: next }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        setError(result.message ?? t("Your current password is not right."));
        return;
      }
      toast.success(t("Password changed. Use the new one next time."));
      setCurrent("");
      setNext("");
      setAgain("");
      setError(null);
      onClose();
    });
  }

  const type = show ? "text" : "password";
  return (
    <PopupDialog
      open={open}
      onClose={close}
      busy={isPending}
      width={440}
      title={t("Change password")}
      sub={
        <>
          {t("Signed in as")} <b className="font-semibold text-ink">{who}</b>
        </>
      }
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader />}
            {t("Save new password")}
          </Button>
        </>
      }
    >
      <Field htmlFor="member-pw-current" label={t("Current password")}>
        <Input id="member-pw-current" size="md" type={type} autoComplete="current-password" value={current} onChange={(event) => (setCurrent(event.target.value), setError(null))} autoFocus />
      </Field>
      <Field htmlFor="member-pw-new" label={t("New password")}>
        <Input id="member-pw-new" size="md" type={type} autoComplete="new-password" placeholder={t("At least 8 characters, with a letter and a number")} value={next} onChange={(event) => (setNext(event.target.value), setError(null))} />
      </Field>
      <Field htmlFor="member-pw-again" label={t("Type the new password again")}>
        <Input id="member-pw-again" size="md" type={type} autoComplete="new-password" value={again} onChange={(event) => (setAgain(event.target.value), setError(null))} />
      </Field>
      <label className="flex cursor-pointer items-center gap-2 text-small text-ink-2">
        <input type="checkbox" checked={show} onChange={() => setShow(!show)} className="size-4 accent-emerald" />
        {t("Show passwords")}
      </label>
      {error && (
        <p role="alert" className="rounded-[10px] border border-expense/30 bg-expense-soft px-3 py-2.5 text-small leading-[1.45] text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
