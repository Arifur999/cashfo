"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { createAccountAction, updateAccountAction } from "@/lib/customer/accountActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";

export interface SavingsAccountRef {
  id: string;
  name: string;
  accountNumber: string | null;
}

interface SavingsAccountDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  // An account to edit, or null to add one.
  editing: SavingsAccountRef | null;
  // Every savings account's name, so a second one with the same name is refused.
  names: { id: string; name: string }[];
  // The words of the toast after a new one: Goals says money can go in now.
  addedNote?: "goals" | "add-money";
}

// Add or edit a savings account (design: SavingsWallets' Add savings
// account popup): a bank account or mobile banking where saved money sits.
// No money is entered here; its balance builds up as money is added to goals.
export function SavingsAccountDialog({ open, onClose, businessId, editing, names, addedNote = "add-money" }: SavingsAccountDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setNumber(editing?.accountNumber ?? "");
      setError("");
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    const accountName = name.trim();
    if (!accountName) return setError(t("Enter the account name."));
    if (number.replace(/[^0-9০-৯]/g, "").length < 4) return setError(t("Enter the account number."));
    if (names.some((item) => item.name.trim().toLowerCase() === accountName.toLowerCase() && item.id !== editing?.id)) return setError(t("You already have an account with this name."));
    startTransition(async () => {
      const result = editing
        ? await updateAccountAction(businessId, editing.id, { name: accountName, accountNumber: number.trim() })
        : await createAccountAction(businessId, { name: accountName, accountNumber: number.trim(), accountType: "ASSET", accountSubtype: "savings" });
      if (!result.success) {
        setError(t(result.message ?? (editing ? "Failed to update wallet" : "Failed to create wallet")));
        return;
      }
      toast.success(
        editing
          ? t("{name} was updated.", { name: accountName })
          : addedNote === "goals"
            ? t("{name} is ready. You can add money to your goals now.", { name: accountName })
            : t("{name} was added. Pick it in Add money to start saving there.", { name: accountName }),
      );
      onClose();
      router.refresh();
    });
  }

  return (
    <PopupDialog
      className="leading-[normal]"
      open={open}
      onClose={onClose}
      width={480}
      busy={isPending}
      onSubmit={submit}
      title={editing ? t("Edit {name}", { name: editing.name }) : t("Add savings account")}
      sub={t("Where this money actually sits, like a DPS or FDR account.")}
      headClassName="py-4.5"
      titleClassName="leading-[normal]!"
      subClassName="leading-[normal]"
      bodyClassName="gap-3.5 py-5"
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {editing ? t("Save changes") : t("Add account")}
          </Button>
        </>
      }
    >
      <Field htmlFor="sa-name" label={<span className="text-body font-medium text-ink">{t("Account name")}</span>}>
        <Input id="sa-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("e.g. Islami Bank DPS or bKash")} />
      </Field>
      <Field htmlFor="sa-number" label={<span className="text-body font-medium text-ink">{t("Account number")}</span>}>
        <Input id="sa-number" size="md" inputMode="numeric" value={number} onChange={(event) => setNumber(event.target.value.replace(/[^0-9০-৯ -]/g, "").slice(0, 24))} placeholder={t("Bank account or mobile number")} />
      </Field>
      <p className="text-caption leading-normal text-ink-muted">{t("A bank account or mobile banking (bKash, Nagad, Rocket). No money is entered here. The balance builds up as you add money to goals.")}</p>
      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
