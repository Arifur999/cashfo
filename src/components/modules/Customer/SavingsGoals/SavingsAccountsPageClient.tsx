"use client";

import { ArrowRight, Ellipsis, PiggyBank, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletShareBar } from "@/components/modules/Customer/Balance/WalletShareBar";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveAccountAction, removeAccountAction } from "@/lib/customer/accountActions";
import type { SavingsAccountOverview, SavingsGoal, SavingsWalletGoals } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { goalColor, savingsPalette, summaryPalette } from "@/lib/customer/savingsDisplay";
import { maskAccountNumber } from "@/lib/customer/walletVisuals";
import { walletShares } from "@/lib/customer/walletShares";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { RestoreWalletButton } from "./RestoreWalletButton";
import { SavingsAccountDialog, type SavingsAccountRef } from "./SavingsAccountDialog";
import { WalletGoalsDialog } from "./WalletGoalsDialog";

interface SavingsAccountsPageClientProps {
  businessId: string;
  overview: SavingsAccountOverview;
  // The active savings accounts the cards show, in their order.
  activeIds: string[];
  walletGoals: SavingsWalletGoals[];
  goals: Pick<SavingsGoal, "id" | "status">[];
  currency: string;
  canManage: boolean;
  // Arrived from an "Add savings account" link, or to see archived ones.
  openAdd: boolean;
  showArchived: boolean;
}

const MENU_ITEM = "flex min-h-10 cursor-pointer items-center rounded-sm px-2.5 text-small font-medium text-ink focus:bg-surface-sunken";

// Savings accounts (design: SavingsWallets): what sits in the savings
// accounts altogether, what came in and went out and how it is spread,
// then a card per account with the goals its money belongs to. The old
// Savings overview page lives here now.
export function SavingsAccountsPageClient({ businessId, overview, activeIds, walletGoals, goals, currency, canManage, openAdd, showArchived }: SavingsAccountsPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState<"closed" | "create" | SavingsAccountRef>(openAdd && canManage ? "create" : "closed");
  const [viewId, setViewId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(showArchived);
  const [isPending, startTransition] = useTransition();

  // ?add=1 and ?archived=1 have done their job once read.
  useEffect(() => {
    if (openAdd || showArchived) window.history.replaceState(null, "", pathname);
  }, [openAdd, showArchived, pathname]);

  const rows = overview.accounts;
  const byId = new Map(rows.map((row) => [row.id, row]));
  const active = activeIds.map((id) => byId.get(id)).filter((row): row is (typeof rows)[number] => !!row);
  const archived = rows.filter((row) => row.status === "ARCHIVED");
  const total = Number(overview.totalBalance);
  const totals = rows.reduce((sum, row) => ({ in: sum.in + Number(row.totalIn), out: sum.out + Number(row.totalOut) }), { in: 0, out: 0 });
  const goalsOf = (id: string) => walletGoals.find((item) => item.accountId === id)?.goals ?? [];
  const colorOf = (goalId: string) => {
    const index = goals.findIndex((goal) => goal.id === goalId);
    return index < 0 ? "var(--ink-faint)" : goalColor(index, goals[index].status);
  };
  const viewing = viewId ? byId.get(viewId) : undefined;

  async function archive(row: (typeof rows)[number]) {
    const ok = await confirm({
      title: t("Archive {name}?", { name: row.name }),
      message: t("It stops showing in Add money and Withdraw. Its history and {amount} stay in your records, and you can restore it any time.", { amount: money(row.currentBalance) }),
      confirmLabel: "Archive",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await archiveAccountAction(businessId, row.id);
      if (result.success) {
        toast.success(t("{name} was archived.", { name: row.name }));
        router.refresh();
      } else toast.error(t(result.message ?? "Failed to archive wallet"));
    });
  }

  async function remove(row: (typeof rows)[number]) {
    const ok = await confirm({
      title: t("Remove {name}?", { name: row.name }),
      message: t("A wallet with transactions is archived instead of deleted, so your history stays whole."),
      confirmLabel: "Remove wallet",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await removeAccountAction(businessId, row.id);
      if (result.success) {
        toast.success(result.data?.deleted ? t("Wallet deleted") : t("Wallet archived"));
        router.refresh();
      } else toast.error(t(result.message ?? "Failed to remove wallet"));
    });
  }

  return (
    <PageFrame className="gap-5">
      <PageHeader
        title={t("Savings accounts")}
        description={t("Where your saved money actually sits, for example a bank DPS or FDR account.")}
        actions={
          canManage && (
            <Button onClick={() => setForm("create")}>
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Add savings account")}
            </Button>
          )
        }
      />

      <Card asChild padding="none" className="flex flex-col gap-4 px-6 py-5.5">
        <section aria-label={t("Savings summary")}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-small font-medium text-ink-muted">{t("In your savings accounts")}</span>
              <span className="text-[34px] leading-[1.1] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(total)}</span>
              <span className="text-small text-ink-muted">
                {total > 0 ? t("Built up from money added to your goals") : t("Fills up as you add money to your goals")}
                {archived.length > 0 && Number(overview.inactiveAmount) > 0 && ` · ${t("{amount} in archived accounts", { amount: money(overview.inactiveAmount) })}`}
              </span>
            </div>
            <div className="grid grid-cols-3">
              <Stat label={t("Accounts")} value={formatCount(active.length, fmt)} first />
              <Stat label={t("Added")} value={totals.in > 0 ? `+ ${money(totals.in)}` : money(0)} tone={totals.in > 0 ? "text-emerald" : "text-ink-faint"} />
              <Stat label={t("Taken out")} value={money(totals.out)} tone="text-ink-faint" />
            </div>
          </div>
          {total > 0 ? (
            <WalletShareBar slices={walletShares(rows, (index) => summaryPalette(rows[index].id, activeIds))} label={t("Share of savings by account")} legend currency={currency} />
          ) : (
            <span role="img" aria-label={t("No money in savings accounts yet")} className="block h-3 rounded-full bg-line" />
          )}
        </section>
      </Card>

      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className="text-title text-ink">{t("Your accounts")}</h2>
        {archived.length > 0 && (
          <Button variant="secondary" size="sm" aria-pressed={archivedOpen} onClick={() => setArchivedOpen((value) => !value)} className="pointer-coarse:h-11">
            {archivedOpen ? t("Hide archived") : t("Show archived ({count})", { count: formatCount(archived.length, fmt) })}
          </Button>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {active.map((row, index) => {
          const palette = savingsPalette(index);
          const held = goalsOf(row.id);
          const names = held.slice(0, 3).map((goal) => goal.goalName);
          return (
            <article key={row.id} aria-label={row.name} className={cn("relative flex min-h-55 flex-col justify-between gap-3 overflow-hidden rounded-lg p-5 text-white shadow-[0_10px_24px_rgba(18,32,29,0.14)]", palette.gradient, isPending && "opacity-70")}>
              <span aria-hidden="true" className="pointer-events-none absolute -top-22.5 -right-17.5 size-55 rounded-full bg-white/7" />
              <div className="relative flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-2.5 py-1 text-caption font-semibold">
                  <PiggyBank className="size-3.5" aria-hidden="true" />
                  {t("Savings account")}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={t("Actions for {name}", { name: row.name })} className="flex size-9 items-center justify-center rounded-full bg-white/16 hover:bg-white/24 pointer-coarse:size-11">
                    <Ellipsis className="size-4.5" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6} className="w-52.5 rounded-[14px] border border-line bg-surface p-1.5 shadow-overlay ring-0">
                    <DropdownMenuItem onSelect={() => setViewId(row.id)} className={MENU_ITEM}>
                      {t("View goals")}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className={MENU_ITEM}>
                      <Link href={`/balance/ledger?accountId=${row.id}&from=/savings-goals/wallet`}>{t("Statement")}</Link>
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem onSelect={() => setForm({ id: row.id, name: row.name, accountNumber: row.accountNumber })} className={MENU_ITEM}>
                          {t("Edit account")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-line" />
                        <DropdownMenuItem onSelect={() => void archive(row)} className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft focus:text-expense")}>
                          {t("Archive")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void remove(row)} className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft focus:text-expense")}>
                          {t("Remove")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="relative flex min-w-0 flex-col gap-1">
                <span className="truncate text-[17px] font-semibold">{row.name}</span>
                <span className="truncate text-small tracking-[0.08em] text-white/75 tabular-nums">{maskAccountNumber(row.accountNumber) ?? t("No account number")}</span>
                <span className="mt-1 truncate text-caption text-white/80">
                  {names.length ? `${names.join(" · ")}${held.length > 3 ? ` · ${t("+{count} more", { count: formatCount(held.length - 3, fmt) })}` : ""}` : t("No goal money here yet")}
                </span>
              </div>
              <div className="relative flex items-end justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-caption text-white/78">{t("Balance")}</span>
                  <span className="truncate text-[26px] leading-[normal] font-bold tabular-nums">{money(row.currentBalance)}</span>
                </span>
                <button type="button" onClick={() => setViewId(row.id)} className="inline-flex h-8.5 shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 text-[12.5px] font-semibold hover:bg-white/28 pointer-coarse:h-11">
                  {t("View goals")}
                  <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
        {canManage ? (
          <button type="button" onClick={() => setForm("create")} className="flex min-h-55 flex-col items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-input bg-surface transition-colors hover:border-emerald">
            <span className="flex size-11 items-center justify-center rounded-field bg-mint-50 text-emerald">
              <Plus className="size-5" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-semibold text-ink">{t("Add savings account")}</span>
            <span className="text-small text-ink-muted">{t("DPS, FDR or any account you save in")}</span>
          </button>
        ) : (
          active.length === 0 && <p className="py-6 text-center text-body text-ink-muted md:col-span-3">{t("No savings account yet.")}</p>
        )}
      </div>

      {archivedOpen && archived.length > 0 && (
        <section aria-label={t("Archived accounts")} className="overflow-hidden rounded-lg border border-line bg-surface">
          <h2 className="border-b border-divider px-5 py-3.5 text-body font-semibold text-ink">{t("Archived accounts")}</h2>
          {archived.map((row) => (
            <div key={row.id} className="flex min-h-15 flex-wrap items-center gap-3.5 border-b border-divider px-5 py-2 last:border-b-0">
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-body font-semibold text-ink">{row.name}</span>
                <span className="text-caption text-ink-muted">{maskAccountNumber(row.accountNumber) ?? t("No account number")}</span>
              </span>
              <span className="text-body font-semibold text-ink-2 tabular-nums">{money(row.currentBalance)}</span>
              {canManage && <RestoreWalletButton businessId={businessId} walletId={row.id} walletName={row.name} className="h-9 rounded-full border border-input px-3.5 text-[13px] text-ink hover:bg-surface-sunken" />}
            </div>
          ))}
        </section>
      )}

      <SavingsAccountDialog open={form !== "closed"} onClose={() => setForm("closed")} businessId={businessId} editing={typeof form === "object" ? form : null} names={rows.map((row) => ({ id: row.id, name: row.name }))} />
      <WalletGoalsDialog
        open={!!viewing}
        onClose={() => setViewId(null)}
        businessId={businessId}
        wallet={viewing ? { id: viewing.id, name: viewing.name, accountNumber: maskAccountNumber(viewing.accountNumber), balance: viewing.currentBalance, totalIn: viewing.totalIn, totalOut: viewing.totalOut } : null}
        goals={viewing ? goalsOf(viewing.id) : []}
        colorOf={colorOf}
        currency={currency}
      />
      {confirmDialog}
    </PageFrame>
  );
}

function Stat({ label, value, tone = "text-ink", first = false }: { label: string; value: string; tone?: string; first?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 border-l border-line px-4 sm:px-6", first && "max-xl:border-l-0 max-xl:pl-0", "last:pr-0")}>
      <span className="text-caption text-ink-muted">{label}</span>
      <span className={cn("text-[18px] font-bold whitespace-nowrap tabular-nums", tone)}>{value}</span>
    </div>
  );
}
