"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createPayoutMethodAction, deletePayoutMethodAction, updatePayoutMethodAction } from "@/lib/customer/referralActions";
import { BANKS, METHOD_BRANDS, methodProblem, normaliseMobile } from "@/lib/customer/referralDisplay";
import type { BankAccountType, PayoutMethod, PayoutMethodInput, PayoutMethodType } from "@/lib/customer/referralTypes";
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


  const typeName = (type: PayoutMethodType) => (type === "BANK" ? t("Bank") : METHOD_BRANDS[type].name);
  const bankChoice = form.otherBank ? OTHER_BANK : BANKS.includes(form.bankName) ? form.bankName : "";

  // The first account, and the default one, are the default already.
  const defaultLocked = !!method?.isDefault || (!method && isFirst);
  const defaultOn = defaultLocked || form.isDefault;
  const nameOk = sameName(form.accountName, userName);
  const LABEL = "text-body leading-[normal] font-medium text-ink";
  const FIELD = "flex min-w-0 flex-col gap-1.5";
  const hint = (field: string) => errorFor(field) && <span role="alert" className="text-caption text-expense">{errorFor(field)}</span>;
  const nameField = (
    <label htmlFor="pm-accountName" className={FIELD}>
      <span className={LABEL}>{wallet ? t("Name on the {service} account", { service: typeName(form.type) }) : t("Account name")}</span>
      <Input id="pm-accountName" size="md" autoComplete="name" value={form.accountName} onChange={(event) => set("accountName", event.target.value)} invalid={!!errorFor("accountName")} frameClassName={cn(!nameOk && form.accountName.trim() && !errorFor("accountName") && "border-[1.5px] border-warning-fill")} />
      {hint("accountName")}
    </label>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
        <DialogContent showCloseButton={false} className="flex max-h-[min(860px,calc(100dvh-32px))] w-135 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-135">
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col leading-[normal]">
            <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4.5">
              <DialogTitle className="text-[18px] font-semibold text-ink">{method ? t("Edit where we send money") : t("Where should we send money?")}</DialogTitle>
              <DialogDescription className="sr-only">{t("bKash, Nagad, Rocket or a bank account")}</DialogDescription>
              <button type="button" onClick={onClose} disabled={isPending} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50">
                <X className="size-4.5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-6 py-4.5">
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
                      className={cn("flex h-16 flex-col items-center justify-center gap-1.5 rounded-field transition-colors disabled:opacity-45", on ? "border-[1.5px] border-emerald bg-emerald-soft" : "border border-line bg-surface hover:border-line-strong")}
                    >
                      <MethodTile method={{ type, bankName: null }} size="type" />
                      <span className={cn("text-[13px] text-ink", on ? "font-bold" : "font-medium")}>{typeName(type)}</span>
                    </button>
                  );
                })}
              </div>

              {!wallet && (
                <>
                  <label htmlFor="pm-bankName" className={FIELD}>
                    <span className={LABEL}>{t("Bank")}</span>
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
                    {form.otherBank && <Input id="pm-otherBank" size="md" aria-label={t("Bank name")} placeholder={t("Bank name")} value={form.bankName} onChange={(event) => set("bankName", event.target.value)} invalid={!!errorFor("bankName")} />}
                    {hint("bankName")}
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)_170px] gap-2.5">
                    <label htmlFor="pm-branch" className={FIELD}>
                      <span className={LABEL}>{t("Branch")}</span>
                      <Input id="pm-branch" size="md" placeholder={t("e.g. Gulshan")} value={form.branch} onChange={(event) => set("branch", event.target.value)} />
                    </label>
                    <div className={FIELD}>
                      <span id="pm-actype" className={LABEL}>
                        {t("Account type")}
                      </span>
                      <div role="radiogroup" aria-labelledby="pm-actype" className="grid h-11 grid-cols-2 gap-0.5 rounded-full bg-surface-sunken p-0.75">
                        {(["SAVINGS", "CURRENT"] as const).map((value) => {
                          const on = form.bankAccountType === value;
                          return (
                            <button key={value} type="button" role="radio" aria-checked={on} onClick={() => set("bankAccountType", value)} className={cn("rounded-full text-[13px]", on ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)]" : "font-medium text-ink-soft")}>
                              {t(value === "SAVINGS" ? "Savings@@account" : "Current@@account")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {nameField}

              <label htmlFor={wallet ? "pm-walletNumber" : "pm-accountNumber"} className={FIELD}>
                <span className={LABEL}>{wallet ? t("{service} number (personal)", { service: typeName(form.type) }) : t("Account number")}</span>
                {wallet ? (
                  <Input id="pm-walletNumber" size="md" inputMode="tel" autoComplete="off" value={form.walletNumber} onChange={(event) => set("walletNumber", event.target.value)} invalid={!!errorFor("walletNumber")} placeholder="01XXXXXXXXX" className="text-[15px] tracking-[0.04em] tabular-nums" />
                ) : (
                  <Input id="pm-accountNumber" size="md" inputMode="numeric" autoComplete="off" placeholder={t("e.g. {number}", { number: "1503 2041 2201" })} value={form.accountNumber} onChange={(event) => set("accountNumber", event.target.value)} invalid={!!errorFor("accountNumber")} className="text-[15px] tracking-[0.04em] tabular-nums" />
                )}
                {hint(wallet ? "walletNumber" : "accountNumber")}
              </label>

              {!wallet && (
                <label htmlFor="pm-routingNumber" className={FIELD}>
                  <span className={LABEL}>{t("Routing number")}</span>
                  <Input id="pm-routingNumber" size="md" inputMode="numeric" autoComplete="off" placeholder={t("9 digits")} value={form.routingNumber} onChange={(event) => set("routingNumber", event.target.value)} invalid={!!errorFor("routingNumber")} className="text-[15px] tracking-[0.04em] tabular-nums" />
                  {hint("routingNumber")}
                </label>
              )}

              <div role="note" className={cn("rounded-field border px-3.5 py-3 text-[13px] leading-normal", nameOk ? "border-emerald-line bg-emerald-soft text-brand-ink" : "border-warning-line bg-warning-50 text-due-ink")}>
                {nameOk
                  ? t("The name matches your Smartly profile, {name}.", { name: userName })
                  : t("The account name must match your name in Smartly, {name}. If it doesn't, the payment is rejected and the money goes back to your balance.", { name: userName })}
              </div>

              <label className={cn("flex items-center gap-2.5 text-body text-ink-2", defaultLocked ? "cursor-default" : "cursor-pointer")}>
                <Checkbox checked={defaultOn} disabled={defaultLocked} onCheckedChange={(next) => set("isDefault", next === true)} className="size-4.5 rounded-[5px] border-[1.5px] border-ink-faint disabled:opacity-100" />
                {t("Use this account by default")}
              </label>

              {problem?.field === "form" && (
                <p role="alert" className="rounded-field bg-expense-soft px-3.5 py-2.5 text-[13px] font-medium text-expense">
                  {t(problem.message)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2.5 border-t border-line bg-strip px-6 py-3.5">
              {method && (
                <button type="button" onClick={() => setConfirmRemove(true)} disabled={isPending} className="h-10 rounded-full px-3 text-body font-semibold text-expense hover:bg-expense-soft disabled:opacity-50">
                  {t("Remove")}
                </button>
              )}
              <span className="flex-1" />
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="h-10 px-4">
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={isPending} className="h-10 px-4.5">
                {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                {t("Save account")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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

// The same name, give or take capitals and spaces.
function sameName(a: string, b: string): boolean {
  const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(a) !== "" && norm(a) === norm(b);
}
