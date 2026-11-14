"use client";

import { TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Checkbox } from "@/components/ui/checkbox";
import { createPayoutMethodAction, deletePayoutMethodAction, makeDefaultPayoutMethodAction, updatePayoutMethodAction } from "@/lib/customer/referralActions";
import { BANKS, METHOD_BRANDS, methodProblem, normaliseMobile } from "@/lib/customer/referralDisplay";
import type { BankAccountType, PayoutMethod, PayoutMethodInput, PayoutMethodType } from "@/lib/customer/referralTypes";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MethodTile } from "./ReferralBits";

interface PayoutMethodDrawerProps {
  open: boolean;
  // The method being edited, or null for a new one.
  method: PayoutMethod | null;
  // The member's own name: the account's name must match it.
  userName: string;
  // The kinds the admin allows today.
  allowed: PayoutMethodType[];
  // The first saved method becomes the default by itself.
  isFirst: boolean;
  onClose: () => void;
  onSaved: (method: PayoutMethod | null) => void;
}

const TYPES: PayoutMethodType[] = ["BKASH", "NAGAD", "ROCKET", "BANK"];
const OTHER_BANK = "__other";

interface FormState {
  type: PayoutMethodType;
  accountName: string;
  walletNumber: string;
  bankName: string;
  // A bank not in the list, typed.
  otherBank: boolean;
  branch: string;
  bankAccountType: BankAccountType;
  accountNumber: string;
  routingNumber: string;
  isDefault: boolean;
}

function initialState(method: PayoutMethod | null, userName: string, allowed: PayoutMethodType[]): FormState {
  const bankName = method?.bankName ?? "";
  return {
    type: method?.type ?? allowed[0] ?? "BKASH",
    accountName: method?.accountName ?? userName,
    walletNumber: method?.walletNumber ?? "",
    bankName,
    otherBank: !!bankName && !BANKS.includes(bankName),
    branch: method?.branch ?? "",
    bankAccountType: method?.bankAccountType ?? "SAVINGS",
    accountNumber: method?.accountNumber ?? "",
    routingNumber: method?.routingNumber ?? "",
    isDefault: method?.isDefault ?? false,
  };
}

// Where should we send money? (PayoutMethodDrawer): bKash, Nagad or Rocket
// (the number and the name on it) or a bank account (the bank, branch,
// Savings or Current, the name, the number and the 9-digit routing
// number). The name must match the member's, or the payment is rejected.
// Editing one adds Remove, and Use by default moves the default here.
export function PayoutMethodDrawer({ open, method, userName, allowed, isFirst, onClose, onSaved }: PayoutMethodDrawerProps) {
  const { t } = useLocale();
  const [form, setForm] = useState<FormState>(() => initialState(method, userName, allowed));
  const [problem, setProblem] = useState<{ field: string; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);

  // A fresh form each time it opens, for the method it opens on.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = open ? (method?.id ?? "new") : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (open) {
      setForm(initialState(method, userName, allowed));
      setProblem(null);
    }
  }

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (problem?.field === field) setProblem(null);
  };
  const wallet = form.type !== "BANK";
  const errorFor = (field: string) => (problem?.field === field ? t(problem.message) : undefined);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    const local = methodProblem({ ...form, bankName: form.bankName });
    if (local) {
      setProblem(local);
      document.getElementById(`pm-${local.field}`)?.focus();
      return;
    }
    const input: PayoutMethodInput = wallet
      ? { type: form.type, accountName: form.accountName.trim(), walletNumber: normaliseMobile(form.walletNumber), bankName: null, branch: null, bankAccountType: null, accountNumber: null, routingNumber: null }
      : {
          type: "BANK",
          accountName: form.accountName.trim(),
          walletNumber: null,
          bankName: form.bankName.trim(),
          branch: form.branch.trim() || null,
          bankAccountType: form.bankAccountType,
          accountNumber: form.accountNumber.replace(/[\s-]/g, ""),
          routingNumber: form.routingNumber.replace(/[\s-]/g, ""),
        };
    startTransition(async () => {
      try {
        const result = method ? await updatePayoutMethodAction(method.id, { ...input, ...(form.isDefault && !method.isDefault && { isDefault: true }) }) : await createPayoutMethodAction({ ...input, ...(form.isDefault && { isDefault: true }) });
        if (!result.success || !result.data) {
          setProblem({ field: "form", message: result.message ?? "Couldn't save the account." });
          return;
        }
        toast.success(t(method ? "Account saved" : "Account added"));
        onSaved(result.data);
      } catch {
        setProblem({ field: "form", message: "Couldn't reach Smartly. Check your connection and try again." });
      }
    });
  }

  function remove() {
    if (!method) return;
    startTransition(async () => {
      try {
        const result = await deletePayoutMethodAction(method.id);
        if (!result.success) {
          toast.error(t(result.message ?? "Couldn't remove the account."));
          return;
        }
        setConfirmRemove(false);
        toast.success(t("Account removed"));
        onSaved(null);
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  function makeDefault() {
    if (!method) return;
    startTransition(async () => {
      const result = await makeDefaultPayoutMethodAction(method.id).catch(() => null);
      if (result?.success && result.data) {
        toast.success(t("Now your default account"));
        onSaved(result.data);
      } else toast.error(t(result?.message ?? "Couldn't save the account."));
    });
  }

  const typeName = (type: PayoutMethodType) => (type === "BANK" ? t("Bank") : METHOD_BRANDS[type].name);
  const bankChoice = form.otherBank ? OTHER_BANK : BANKS.includes(form.bankName) ? form.bankName : "";

  return (
    <>
      <Drawer
        open={open}
        title={t("Where should we send money?")}
        width={480}
        busy={isPending}
        onClose={onClose}
        onSubmit={submit}
        footer={
          <>
            {method && (
              <Button type="button" variant="ghost" onClick={() => setConfirmRemove(true)} disabled={isPending} className="mr-auto text-expense hover:text-expense">
                {t("Remove")}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="text-ink-soft">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="px-4.5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Save account")}
            </Button>
          </>
        }
      >
        <div className="-mb-1 flex flex-col gap-4">
          <div role="radiogroup" aria-label={t("Type@@payout")} className="grid grid-cols-4 gap-2">
            {TYPES.map((type) => {
              const on = form.type === type;
              const off = !allowed.includes(type) && method?.type !== type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={off}
                  onClick={() => set("type", type)}
                  className={cn("flex h-16 flex-col items-center justify-center gap-1.5 rounded-field border bg-surface transition-colors disabled:opacity-45", on ? "border-[1.5px] border-emerald bg-emerald-soft" : "border-line hover:border-line-strong")}
                >
                  <MethodTile method={{ type, bankName: null }} size="type" />
                  <span className={cn("text-[13px] leading-[normal] text-ink", on ? "font-bold" : "font-medium")}>{typeName(type)}</span>
                </button>
              );
            })}
          </div>

          {wallet ? (
            <Field htmlFor="pm-walletNumber" label={t("{service} number", { service: typeName(form.type) })} error={errorFor("walletNumber")} hint={form.type === "ROCKET" ? t("11 digits, or 12 with the last digit.") : t("11 digits, starting with 01.")}>
              <Input id="pm-walletNumber" size="md" inputMode="tel" autoComplete="off" value={form.walletNumber} onChange={(event) => set("walletNumber", event.target.value)} invalid={!!errorFor("walletNumber")} placeholder="01XXX-XXXXXX" className="text-[15px] tracking-[0.04em] tabular-nums" />
            </Field>
          ) : (
            <>
              <Field htmlFor="pm-bankName" label={t("Bank")} error={errorFor("bankName")}>
                <NativeSelect
                  id="pm-bankName"
                  size="md"
                  value={bankChoice}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({ ...current, otherBank: value === OTHER_BANK, bankName: value === OTHER_BANK ? "" : value }));
                    if (problem?.field === "bankName") setProblem(null);
                  }}
                  invalid={!!errorFor("bankName") && !form.otherBank}
                  className="font-normal"
                >
                  <option value="" disabled>
                    {t("Choose your bank")}
                  </option>
                  {BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                  <option value={OTHER_BANK}>{t("Another bank")}</option>
                </NativeSelect>
                {form.otherBank && (
                  <Input id="pm-otherBank" size="md" aria-label={t("Bank name")} placeholder={t("Bank name")} value={form.bankName} onChange={(event) => set("bankName", event.target.value)} invalid={!!errorFor("bankName")} />
                )}
              </Field>
              <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-2.5">
                <Field htmlFor="pm-branch" label={t("Branch")}>
                  <Input id="pm-branch" size="md" placeholder={t("e.g. Gulshan")} value={form.branch} onChange={(event) => set("branch", event.target.value)} />
                </Field>
                <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
                  <legend className="mb-1.5 p-0 text-body leading-[normal] font-medium text-ink">{t("Account type")}</legend>
                  <SegmentedControl
                    label="Account type"
                    variant="pill"
                    stretch
                    value={form.bankAccountType}
                    onChange={(value) => set("bankAccountType", value)}
                    className="h-11 items-stretch"
                    options={[
                      { value: "SAVINGS", label: "Savings@@account" },
                      { value: "CURRENT", label: "Current@@account" },
                    ]}
                  />
                </fieldset>
              </div>
            </>
          )}

          <Field htmlFor="pm-accountName" label={t("Account name")} error={errorFor("accountName")}>
            <Input id="pm-accountName" size="md" autoComplete="name" value={form.accountName} onChange={(event) => set("accountName", event.target.value)} invalid={!!errorFor("accountName")} />
          </Field>

          {!wallet && (
            <>
              <Field htmlFor="pm-accountNumber" label={t("Account number")} error={errorFor("accountNumber")}>
                <Input id="pm-accountNumber" size="md" inputMode="numeric" autoComplete="off" placeholder={t("e.g. {number}", { number: "1503 2041 2201" })} value={form.accountNumber} onChange={(event) => set("accountNumber", event.target.value)} invalid={!!errorFor("accountNumber")} className="text-[15px] tracking-[0.04em] tabular-nums" />
              </Field>
              <Field htmlFor="pm-routingNumber" label={t("Routing number")} error={errorFor("routingNumber")} hint={t("9 digits. It's on your cheque book or in your bank's app.")}>
                <Input id="pm-routingNumber" size="md" inputMode="numeric" autoComplete="off" placeholder={t("9 digits")} value={form.routingNumber} onChange={(event) => set("routingNumber", event.target.value)} invalid={!!errorFor("routingNumber")} className="text-[15px] tracking-[0.04em] tabular-nums" />
              </Field>
            </>
          )}

          <div role="note" className="flex items-start gap-2.5 rounded-field border border-warning-line bg-warning-50 px-3.5 py-3 text-[13px] leading-[normal] text-warning-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>{fillNodes(t("The account name must match your name in Smartly, {name}. If it doesn't, the payment is rejected and the money goes back to your balance."), { name: <b className="font-semibold">{userName}</b> })}</span>
          </div>

          {problem?.field === "form" && (
            <p role="alert" className="rounded-field bg-expense-soft px-3.5 py-2.5 text-small text-expense">
              {t(problem.message)}
            </p>
          )}

          {method?.isDefault ? (
            <p className="text-body text-ink-2">{t("This is your default account.")}</p>
          ) : method ? (
            <Button type="button" variant="link" onClick={makeDefault} disabled={isPending} className="self-start text-body">
              {t("Use this account by default")}
            </Button>
          ) : isFirst ? (
            <p className="text-body text-ink-2">{t("Your first account is your default.")}</p>
          ) : (
            <label className="flex cursor-pointer items-center gap-2.5 text-body text-ink-2">
              <Checkbox checked={form.isDefault} onCheckedChange={(next) => set("isDefault", next === true)} className="size-4.5 rounded-[5px] border-[1.5px] border-ink-faint" />
              {t("Use this account by default")}
            </label>
          )}
          <span className="text-[12.5px] leading-[normal] text-ink-muted">{t("For bKash, Nagad or Rocket you only enter the number (personal account) and the name on it.")}</span>
        </div>
      </Drawer>
      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={remove}
        isPending={isPending}
        title={t("Remove this account?")}
        description={t("It won't be offered for withdrawals any more. Requests already sent to it are not affected.")}
        confirmLabel={t("Remove account")}
      />
    </>
  );
}
