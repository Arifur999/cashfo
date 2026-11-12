"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { createAccountAction, updateAccountAction } from "@/lib/customer/accountActions";
import { deepBand, isGoalColor } from "@/lib/customer/savingsColors";
import { ColorRow } from "./ColorRow";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";

export interface SavingsAccountRef {
  id: string;
  name: string;
  accountNumber: string | null;
  // Its card colour as the page draws it now.
  color?: string | null;
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
  // A new one's first colour: one no other account wears yet.
  freshColor?: string;
}

// Add or edit a savings account (design: SavingsWallets' Add savings
// account popup): a bank account or mobile banking where saved money sits.
// No money is entered here; its balance builds up as money is added to goals.
export function SavingsAccountDialog({ open, onClose, businessId, editing, names, addedNote = "add-money", freshColor = "#235347" }: SavingsAccountDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setNumber(editing?.accountNumber ?? "");
      setColor(isGoalColor(editing?.color) ? editing.color.toLowerCase() : freshColor);
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
        ? await updateAccountAction(businessId, editing.id, { name: accountName, accountNumber: number.trim(), ...(color && { color }) })
        : await createAccountAction(businessId, { name: accountName, accountNumber: number.trim(), accountType: "ASSET", accountSubtype: "savings", ...(color && { color }) });
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
      width={520}
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
      <div aria-hidden="true" className="relative flex h-28 flex-col justify-between overflow-hidden rounded-[18px] px-4.5 py-4 text-white transition-[background] duration-200" style={{ background: deepBand(color || freshColor), boxShadow: `0 1px 2px rgb(18 32 29 / 0.06), 0 16px 32px -14px color-mix(in srgb, ${color || freshColor} 70%, transparent)` }}>
        <span className="pointer-events-none absolute -top-20 -right-15 size-50 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.16)_0,transparent_68%)]" />
        <span className="pointer-events-none absolute -right-7.5 -bottom-27.5 size-45 rounded-full border border-white/12" />
        <span className="relative self-start rounded-full border border-white/22 bg-white/14 px-2.25 py-0.75 text-[11px] font-semibold">{t("Savings account")}</span>
        <span className="relative flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[16px] font-semibold">{name.trim() || editing?.name || t("Account name")}</span>
          <span className="text-[12px] tracking-[0.08em] text-white/75">{number.trim() || "0000 0000 0000"}</span>
        </span>
      </div>
      <Field htmlFor="sa-name" label={<span className="text-body font-medium text-ink">{t("Account name")}</span>}>
        <Input id="sa-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={80} placeholder={t("e.g. Islami Bank DPS or bKash")} />
      </Field>
      <Field htmlFor="sa-number" label={<span className="text-body font-medium text-ink">{t("Account number")}</span>}>
        <Input id="sa-number" size="md" inputMode="numeric" value={number} onChange={(event) => setNumber(event.target.value.replace(/[^0-9০-৯ -]/g, "").slice(0, 24))} placeholder={t("Bank account or mobile number")} />
      </Field>
      <ColorRow value={color} onChange={setColor} size={26} stacked />
      <p className="text-caption leading-normal text-ink-muted">{t("A bank account or mobile banking (bKash, Nagad, Rocket). No money is entered here. The balance builds up as you add money to goals.")}</p>
      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
