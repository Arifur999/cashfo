"use client";

import { Pencil, Plus, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import { makeDefaultPayoutMethodAction } from "@/lib/customer/referralActions";
import { formatWalletNumber, maskAccount, METHOD_BRANDS } from "@/lib/customer/referralDisplay";
import type { PayoutMethod, PayoutMethodType } from "@/lib/customer/referralTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PayoutMethodDrawer } from "./PayoutMethodDrawer";
import { MethodTile } from "./ReferralBits";

// A saved method's name ("bKash · Personal", "Dutch-Bangla Bank") and line
// ("01711-482915 · Khaled Mahmud", "Savings •••• 4417 · Mirpur").
export function useMethodWords() {
  const { t } = useLocale();
  return {
    title: (method: PayoutMethod) => (method.type === "BANK" ? (method.bankName ?? t("Bank")) : `${METHOD_BRANDS[method.type].name} · ${t("Personal@@wallet")}`),
    detail: (method: PayoutMethod, { withName = false, withBranch = false } = {}) =>
      method.type === "BANK"
        ? [`${t(method.bankAccountType === "CURRENT" ? "Current@@account" : "Savings@@account")} ${maskAccount(method.accountNumber)}`, withName ? method.accountName : null, method.branch ? (withBranch ? t("{branch} branch", { branch: method.branch }) : method.branch) : null]
            .filter(Boolean)
            .join(" · ")
        : `${formatWalletNumber(method.walletNumber)} · ${method.accountName}`,
  };
}

const sorted = (methods: PayoutMethod[]) => [...methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.localeCompare(b.createdAt));

interface PayoutMethodsCardProps {
  methods: PayoutMethod[];
  userName: string;
  allowed: PayoutMethodType[];
}

// "Where we send your money" (ReferralProfile): every saved account with
// its warning (another name, or a rejection there), edit, make default,
// and add another in the drawer.
export function PayoutMethodsCard({ methods: initial, userName, allowed }: PayoutMethodsCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const words = useMethodWords();
  const [methods, setMethods] = useState(() => sorted(initial));
  const [drawer, setDrawer] = useState<{ open: boolean; method: PayoutMethod | null }>({ open: false, method: null });
  const [isPending, startTransition] = useTransition();

  // The server's newer read wins (after a refresh).
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setMethods(sorted(initial));
  }

  // The line a saved method warns with.
  function warningOf(method: PayoutMethod): string | null {
    if (method.lastRejection)
      return method.lastRejection.reason
        ? t("The last withdrawal here was rejected: {reason}. Check it before using this account.", { reason: method.lastRejection.reason.replace(/[.\s]+$/, "") })
        : t("The last withdrawal here was rejected. Check it before using this account.");
    if (!method.nameMatches) return t("The name on this account is different from your profile, {name}. Payments to it can be rejected.", { name: userName });
    return null;
  }

  function saved(method: PayoutMethod | null) {
    setDrawer({ open: false, method: null });
    router.refresh();
    if (!method) return;
    setMethods((current) => sorted([...current.filter((row) => row.id !== method.id).map((row) => (method.isDefault ? { ...row, isDefault: false } : row)), method]));
  }

  function makeDefault(method: PayoutMethod) {
    startTransition(async () => {
      const result = await makeDefaultPayoutMethodAction(method.id).catch(() => null);
      if (result?.success && result.data) {
        saved(result.data);
        toast.success(t("{name} is now your default", { name: words.title(method) }));
      } else toast.error(t(result?.message ?? "Couldn't save the account."));
    });
  }

  return (
    <Card padding="none" className="overflow-clip" role="region" aria-labelledby="pm-title">
      <div className="flex flex-col gap-0.5 px-4.5 pt-4 pb-3 md:px-5">
        <h2 id="pm-title" className="text-title text-ink">
          {t("Where we send your money")}
        </h2>
        <span className="text-[12.5px] text-ink-muted">{t("Add every account you might use. The default is picked first when you withdraw.")}</span>
      </div>
      {methods.map((method) => {
        const warning = warningOf(method);
        const title = words.title(method);
        return (
          <div key={method.id} className="flex flex-col gap-2 border-t border-divider px-4.5 py-3 md:px-5">
            <div className="flex items-center gap-3">
              <MethodTile method={method} size="md" />
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="flex min-w-0 items-center gap-1.5 text-body font-semibold text-ink">
                  <span className="truncate">{title}</span>
                  {method.isDefault && <span className="shrink-0 rounded-full bg-surface-sunken px-1.75 py-px text-[11px] font-semibold text-ink-soft">{t("Default")}</span>}
                </span>
                <span className="truncate text-[12.5px] text-ink-muted tabular-nums">{words.detail(method, { withBranch: false })}</span>
                {!method.isDefault && allowed.includes(method.type) && (
                  <button type="button" disabled={isPending} onClick={() => makeDefault(method)} className="w-fit rounded-sm text-[12.5px] font-semibold text-emerald hover:underline disabled:opacity-60">
                    {t("Make default")}
                  </button>
                )}
              </span>
              <button
                type="button"
                onClick={() => setDrawer({ open: true, method })}
                aria-label={t("Edit {name}", { name: title })}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11"
              >
                <Pencil className="size-3.75" aria-hidden="true" />
              </button>
            </div>
            {warning && (
              <span className="flex gap-1.5 rounded-lg bg-warning-50 px-2.5 py-2 text-caption leading-[1.45] text-warning-ink">
                <TriangleAlert className="mt-px size-3.25 shrink-0 text-warning" aria-hidden="true" />
                {warning}
              </span>
            )}
          </div>
        );
      })}
      {methods.length === 0 && <p className="border-t border-divider px-4.5 py-3 text-small text-ink-muted md:px-5">{t("No account saved yet. Add bKash, Nagad, Rocket or a bank account.")}</p>}
      <div className="border-t border-divider px-4.5 pt-3 pb-4 md:px-5">
        <button
          type="button"
          onClick={() => setDrawer({ open: true, method: null })}
          className="flex h-10.5 w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-dashed border-input bg-surface text-[13.5px] font-semibold text-emerald hover:border-emerald"
        >
          <Plus className="size-3.75" strokeWidth={2.25} aria-hidden="true" />
          {t("Add bKash, Nagad, Rocket or bank")}
        </button>
      </div>
      <PayoutMethodDrawer open={drawer.open} method={drawer.method} userName={userName} allowed={allowed} isFirst={methods.length === 0} onClose={() => setDrawer({ open: false, method: null })} onSaved={saved} />
    </Card>
  );
}
