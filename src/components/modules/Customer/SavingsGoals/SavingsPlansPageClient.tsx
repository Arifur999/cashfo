"use client";

import { CalendarDays, Coins, Ellipsis, Link2, List, PencilLine, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Button from "@/components/smartly/Button";
import { iconActionClass } from "@/components/smartly/IconAction";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SavingsPlan } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDay } from "@/lib/date";
import { colorButton, deepBand, ownColor, shade } from "@/lib/customer/savingsColors";
import { createSavingsPlanAction, deleteSavingsPlanAction, updateSavingsPlanEntryAction } from "@/lib/customer/savingsGoalActions";
import { savingsError } from "@/lib/customer/savingsDisplay";
import { linkHref, planEmoji, planWhen, plansSummary, PRIORITY_META, shortLink, sortPlans, type PlanSort } from "@/lib/customer/savingsPlans";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useStoredChoice } from "../Balance/useStoredChoice";
import { LIST_VIEWS, type ListView } from "../Shared/ViewToggle";
import { PlanFormDialog } from "./PlanFormDialog";

interface SavingsPlansPageClientProps {
  businessId: string;
  plans: SavingsPlan[];
  // What the active goals need a month: the third KPI's "on top of".
  goalsMonthly: number;
  currency: string;
  canManage: boolean;
  today: string;
}

const SORTS: { value: PlanSort; label: string }[] = [
  { value: "PRIORITY", label: "Priority" },
  { value: "NEED_BY", label: "Need by" },
  { value: "AMOUNT", label: "Amount" },
];
const MENU_ITEM = "flex min-h-9.5 cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 text-[13.5px] font-medium text-ink focus:bg-surface-sunken [&_svg]:size-3.75";

type Modal = { kind: "form"; id?: string } | { kind: "delete"; id: string };

// Savings Goals › Saving plans (SavingsPlans board): things to save for
// later, written down now and started as a goal when the time is right.
// How many wait and what they need; Coming up as cards (or every plan as a
// table) in the order picked, then Someday; each starts as a goal, or is
// edited or deleted, with Undo.
export function SavingsPlansPageClient({ businessId, plans, goalsMonthly, currency, canManage, today }: SavingsPlansPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const day = (iso: string) => formatDay(iso, "d MMMM yyyy", fmt);
  const [view, setView] = useStoredChoice<ListView>("smartly-plans-view", LIST_VIEWS, "cards");
  const [sort, setSort] = useState<PlanSort>("PRIORITY");
  const [modal, setModal] = useState<Modal | null>(null);
  const [isPending, startTransition] = useTransition();

  const { dated, someday } = sortPlans(plans, sort);
  const summary = plansSummary(plans);
  const byId = (id: string | undefined) => plans.find((plan) => plan.id === id) ?? null;
  const current = modal && "id" in modal ? byId(modal.id) : null;
  const colorOf = (plan: SavingsPlan) => ownColor(plan.color, plans.indexOf(plan));
  const close = () => setModal(null);
  const startHref = (plan: SavingsPlan) => `/savings-goals/dashboard?plan=${plan.id}`;
  const when = (plan: SavingsPlan) => {
    const words = planWhen(plan, today);
    return words.count === undefined ? t(words.key) : t(words.key, { count: formatCount(words.count, fmt) });
  };
  const by = (plan: SavingsPlan, short = false) => (plan.neededBy ? t("by {date}", { date: formatDay(plan.neededBy, short ? "d MMM yy" : "d MMMM yyyy", fmt) }) : t("No date yet"));

  // Undo puts the plan back as it was: a new one is deleted again, an edit
  // gets its old fields, a deleted one comes back with its planned day.
  const asInput = (plan: SavingsPlan) => ({
    name: plan.name,
    category: plan.category,
    color: plan.color,
    amount: Number(plan.amount),
    horizon: plan.horizon,
    ...(plan.needBy && { needBy: plan.needBy }),
    priority: plan.priority,
    note: plan.note ?? "",
    link: plan.link ?? "",
  });
  const offerUndo = (message: string, run: () => Promise<{ success: boolean }>, done: string) =>
    toast.success(message, {
      duration: 6000,
      action: {
        label: t("Undo"),
        onClick: () =>
          void run().then((result) => {
            if (result.success) toast.success(done);
            else toast.error(t("Couldn't undo that. Try again."));
            router.refresh();
          }),
      },
    });

  function saved(plan: SavingsPlan, before: SavingsPlan | null) {
    setModal(null);
    router.refresh();
    if (before) offerUndo(t("{name} was updated.", { name: plan.name }), () => updateSavingsPlanEntryAction(businessId, plan.id, asInput(before)), t("Change undone."));
    else offerUndo(t("{name} was added to your plans.", { name: plan.name }), () => deleteSavingsPlanAction(businessId, plan.id), t("Plan removed."));
  }

  function remove(plan: SavingsPlan) {
    if (isPending) return;
    startTransition(async () => {
      const result = await deleteSavingsPlanAction(businessId, plan.id);
      if (!result.success) {
        toast.error(savingsError(result.message, "Failed to delete the plan", t, currency, fmt));
        return;
      }
      setModal(null);
      router.refresh();
      offerUndo(t("{name} was deleted.", { name: plan.name }), () => createSavingsPlanAction(businessId, { ...asInput(plan), plannedOn: plan.plannedOn }), t("{name} is back in your plans.", { name: plan.name }));
    });
  }

  const kpis = [
    { label: t("Plans waiting"), value: formatCount(summary.count, fmt), sub: summary.high ? t(summary.high === 1 ? "{count} high priority" : "{count} high priority", { count: formatCount(summary.high, fmt) }) : t("None marked high"), icon: List, hero: true, tile: "" },
    { label: t("Total needed"), value: money(summary.total), sub: t(summary.count === 1 ? "For all {count} plan" : "For all {count} plans", { count: formatCount(summary.count, fmt) }), icon: Coins, hero: false, tile: "bg-emerald-soft text-emerald" },
    { label: t("If you start them all"), value: t("{amount} a month", { amount: money(summary.monthly) }), sub: t("On top of {amount} a month your active goals need", { amount: money(goalsMonthly) }), icon: CalendarDays, hero: false, tile: "bg-warning-soft text-warning" },
  ];

  const menu = (plan: SavingsPlan, compact = false) =>
    canManage && (
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={t("Actions for {name}", { name: plan.name })} disabled={isPending} className={cn(iconActionClass(), compact ? "size-8 rounded-[9px]" : "size-8 rounded-[9px]", "data-open:border-mint-200 data-open:bg-emerald-soft data-open:text-emerald")}>
          <Ellipsis aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="flex w-50 flex-col gap-0.5 rounded-[14px] border border-line bg-surface p-1.5 leading-[normal] shadow-overlay ring-0">
          <DropdownMenuItem onSelect={() => setModal({ kind: "form", id: plan.id })} className={MENU_ITEM}>
            <PencilLine aria-hidden="true" />
            {t("Edit plan@@savings")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setModal({ kind: "delete", id: plan.id })} className={cn(MENU_ITEM, "text-loss-ink focus:bg-expense-soft focus:text-loss-ink")}>
            <Trash2 aria-hidden="true" />
            {t("Delete plan@@savings")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

  const chip = "rounded-full px-2.25 py-0.75 text-[11.5px] font-bold whitespace-nowrap";

  return (
    <PageFrame className="gap-5 leading-[normal]">
      <PageHeader
        title={t("Saving plans")}
        description={t("Things you want to save for later. Write them down now, start a goal when you are ready.")}
        actions={
          canManage && (
            <Button onClick={() => setModal({ kind: "form" })} className="gap-1.5">
              <Plus strokeWidth={2.5} className="size-4" />
              {t("New plan")}
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={cn("relative flex flex-col gap-1.5 overflow-hidden rounded-[18px] border px-5 py-4.5 shadow-[0_1px_2px_rgb(18_32_29/0.04),0_6px_20px_rgb(18_32_29/0.05)]", kpi.hero ? "border-transparent text-white" : "border-line-card bg-surface text-ink")}
            style={kpi.hero ? { background: deepBand("var(--emerald)") } : undefined}
          >
            {kpi.hero && <span aria-hidden="true" className="pointer-events-none absolute -top-17.5 -right-12.5 size-45 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.16)_0,transparent_68%)]" />}
            <span className={cn("relative flex items-center gap-2 text-[12.5px] font-semibold", kpi.hero ? "text-white/85" : "text-ink-2")}>
              <span aria-hidden="true" className={cn("flex size-7 items-center justify-center rounded-[9px]", kpi.hero ? "bg-white/16 text-white" : kpi.tile)}>
                <kpi.icon className="size-3.75" strokeWidth={2} />
              </span>
              {kpi.label}
            </span>
            <span className="relative text-[28px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums">{kpi.value}</span>
            <span className={cn("relative text-[12.5px] tabular-nums", kpi.hero ? "text-white/78" : "text-ink-muted")}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-input bg-surface px-6 py-14 text-center">
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-[16px] bg-emerald-soft text-emerald">
            <List className="size-6" strokeWidth={2} />
          </span>
          <span className="text-[17px] font-bold text-ink">{t("No plans yet")}</span>
          <span className="max-w-105 text-[13.5px] leading-[1.55] text-ink-muted">{t("Write down what you want to save for, how much it costs and when you need it. Start it as a goal when the time is right.")}</span>
          {canManage && <Button onClick={() => setModal({ kind: "form" })}>{t("Add your first plan")}</Button>}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-[16px] font-bold text-ink">{view === "table" ? t("All plans@@savings") : t("Coming up")}</h2>
              <span className="text-[13px] text-ink-muted">{t((view === "table" ? plans.length : dated.length) === 1 ? "{count} plan" : "{count} plans", { count: formatCount(view === "table" ? plans.length : dated.length, fmt) })}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-ink-muted max-sm:hidden">{t("Sort by")}</span>
              <div role="radiogroup" aria-label={t("Sort plans")} className="flex rounded-full bg-toggle-track p-0.75">
                {SORTS.map((option) => {
                  const on = sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setSort(option.value)}
                      className={cn("h-7.5 rounded-full px-3 text-[12.5px] font-semibold", on ? "bg-surface text-ink shadow-[0_1px_2px_rgb(18_32_29/0.12)] dark:bg-surface-raised" : "text-ink-muted hover:text-ink")}
                    >
                      {t(option.label)}
                    </button>
                  );
                })}
              </div>
              <div role="radiogroup" aria-label={t("View")} className="flex rounded-[10px] bg-toggle-track p-0.75">
                {LIST_VIEWS.map((option) => {
                  const on = view === option;
                  const label = t(option === "table" ? "Table view" : "Card view");
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={label}
                      title={label}
                      onClick={() => setView(option)}
                      className={cn("flex h-7.5 w-8 items-center justify-center rounded-[8px]", on ? "bg-surface text-ink shadow-[0_1px_2px_rgb(18_32_29/0.12)] dark:bg-surface-raised" : "text-ink-muted hover:text-ink")}
                    >
                      {option === "table" ? <TableIcon /> : <GridIcon />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {view === "cards" ? (
            <>
              {dated.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {dated.map((plan) => {
                    const c = colorOf(plan);
                    const meta = PRIORITY_META[plan.priority];
                    return (
                      <article key={plan.id} aria-label={plan.name} className="relative flex min-w-0 flex-col rounded-[20px] border border-line-card bg-surface shadow-[0_1px_2px_rgb(18_32_29/0.04),0_8px_22px_-12px_rgb(18_32_29/0.14)]">
                        <div className="flex flex-col gap-3.5 rounded-t-[19px] border-b border-dashed px-4.5 pt-4 pb-3.5" style={{ background: `linear-gradient(180deg, ${shade(c, 0.9)} 0%, ${shade(c, 0.96)} 100%)`, borderColor: shade(c, 0.7) }}>
                          <div className="flex items-center gap-3">
                            <span aria-hidden="true" className="flex size-10.5 shrink-0 items-center justify-center rounded-[12px] border bg-surface text-[20px]" style={{ borderColor: shade(c, 0.72), boxShadow: `0 4px 10px -6px ${c}` }}>
                              {planEmoji(plan.category)}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <h3 className="truncate text-[15px] font-bold text-ink">{plan.name}</h3>
                              <span className="truncate text-[12px] text-ink-muted">{t("Planned on {date}", { date: day(plan.plannedOn) })}</span>
                            </span>
                            {menu(plan)}
                          </div>
                          <div className="flex items-end justify-between gap-2.5">
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: shade(c, -0.18) }}>
                                {t("Needed")}
                              </span>
                              <span className="text-[26px] leading-[1.1] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(plan.amount)}</span>
                            </span>
                            <span className="flex shrink-0 gap-1.5">
                              <span className={cn(chip, meta.chip)}>{t(meta.label)}</span>
                              <span className={cn(chip, "border bg-surface")} style={{ borderColor: shade(c, 0.72), color: shade(c, -0.18) }}>
                                {t("Plan@@savings")}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 px-4.5 pt-3.5 pb-4">
                          <div className="grid grid-cols-2 gap-2.5">
                            <span className="flex min-w-0 flex-col gap-0.75">
                              <span className="text-[11px] font-bold tracking-[0.06em] text-ink-faint uppercase">{t("Need it")}</span>
                              <span className="truncate text-[13.5px] font-bold text-ink">{when(plan)}</span>
                              <span className="truncate text-[12px] text-ink-muted">{by(plan)}</span>
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.75">
                              <span className="text-[11px] font-bold tracking-[0.06em] text-ink-faint uppercase">{t("Start today")}</span>
                              <span className="truncate text-[13.5px] font-bold tabular-nums" style={{ color: shade(c, -0.18) }}>
                                {Number(plan.monthly) > 0 ? money(plan.monthly) : "–"}
                              </span>
                              <span className="text-[12px] text-ink-muted">{t("a month")}</span>
                            </span>
                          </div>
                          {plan.note && <p className="text-[12.5px] leading-[1.5] text-ink-2">{plan.note}</p>}
                          {plan.link && (
                            <a href={linkHref(plan.link)} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.25 self-start truncate text-[12.5px] font-semibold" style={{ color: shade(c, -0.18) }}>
                              <Link2 className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                              <span className="truncate">{shortLink(plan.link)}</span>
                            </a>
                          )}
                          <span className="flex-1" />
                          {canManage && (
                            <Link href={startHref(plan)} className="flex h-10.5 items-center justify-center gap-2 rounded-[12px] text-[13.5px] font-semibold text-white" style={colorButton(c)}>
                              <Play className="size-3 fill-current" strokeWidth={0} aria-hidden="true" />
                              {t("Start goal")}
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-[18px] border-[1.5px] border-dashed border-input bg-surface p-5.5 text-center text-[13.5px] text-ink-muted">{t("No dated plans. Give a plan a time, and it shows up here.")}</p>
              )}

              {someday.length > 0 && (
                <>
                  <div className="flex items-baseline gap-2.5 pt-2">
                    <h2 className="text-[16px] font-bold text-ink">{t("Someday")}</h2>
                    <span className="text-[13px] text-ink-muted">{t(someday.length === 1 ? "{count} plan" : "{count} plans", { count: formatCount(someday.length, fmt) })}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {someday.map((plan) => {
                      const c = colorOf(plan);
                      return (
                        <div key={plan.id} className="flex min-w-0 items-center gap-3 rounded-[16px] border border-dashed border-input bg-surface px-4 py-3.5">
                          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border text-[18px]" style={{ background: `linear-gradient(180deg, ${shade(c, 0.9)} 0%, ${shade(c, 0.96)} 100%)`, borderColor: shade(c, 0.72) }}>
                            {planEmoji(plan.category)}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-[14px] font-bold text-ink">{plan.name}</span>
                            <span className="truncate text-[12.5px] text-ink-muted tabular-nums">{`${money(plan.amount)} · ${t(PRIORITY_META[plan.priority].label)}`}</span>
                          </span>
                          {canManage && (
                            <Link href={startHref(plan)} className="flex h-8.5 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-bold whitespace-nowrap" style={{ background: shade(c, 0.88), color: shade(c, -0.18) }}>
                              <Play className="size-2.75 fill-current" strokeWidth={0} aria-hidden="true" />
                              {t("Start")}
                            </Link>
                          )}
                          {menu(plan, true)}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="overflow-x-auto rounded-[18px] border border-line-card bg-surface shadow-[0_1px_2px_rgb(18_32_29/0.04),0_6px_20px_rgb(18_32_29/0.05)]">
              <table className="w-full min-w-215 border-collapse text-[13.5px] tabular-nums">
                <thead>
                  <tr className="bg-hover text-left text-[12px] text-ink-muted">
                    <th className="px-4.5 py-3 font-semibold">{t("Plan@@savings")}</th>
                    <th className="px-2.5 py-3 font-semibold">{t("Priority")}</th>
                    <th className="px-2.5 py-3 text-right font-semibold">{t("Needed")}</th>
                    <th className="px-2.5 py-3 font-semibold">{t("Need it")}</th>
                    <th className="px-2.5 py-3 text-right font-semibold">{t("Start today")}</th>
                    <th className="px-2.5 py-3 font-semibold">{t("Planned on")}</th>
                    <th className="px-4.5 py-3 text-right font-semibold">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dated, ...someday].map((plan) => {
                    const c = colorOf(plan);
                    const meta = PRIORITY_META[plan.priority];
                    return (
                      <tr key={plan.id} className="border-t border-head-rule">
                        <td className="py-3 pr-2.5 pl-4.5">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span aria-hidden="true" className="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] border text-[15px]" style={{ background: `linear-gradient(180deg, ${shade(c, 0.9)} 0%, ${shade(c, 0.96)} 100%)`, borderColor: shade(c, 0.72) }}>
                              {planEmoji(plan.category)}
                            </span>
                            <span className="flex max-w-57.5 min-w-0 flex-col gap-px">
                              <span className="truncate font-semibold text-ink">{plan.name}</span>
                              {plan.note && <span className="truncate text-[12px] text-ink-muted">{plan.note}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="px-2.5 py-3">
                          <span className={cn(chip, meta.chip)}>{t(meta.label)}</span>
                        </td>
                        <td className="px-2.5 py-3 text-right font-bold whitespace-nowrap text-ink">{money(plan.amount)}</td>
                        <td className="px-2.5 py-3 whitespace-nowrap">
                          <span className="flex flex-col gap-px">
                            <span className="font-semibold text-ink">{when(plan)}</span>
                            <span className="text-[12px] text-ink-muted">{by(plan, true)}</span>
                          </span>
                        </td>
                        <td className="px-2.5 py-3 text-right font-semibold whitespace-nowrap" style={{ color: shade(c, -0.18) }}>
                          {Number(plan.monthly) > 0 ? t("{amount} a month", { amount: money(plan.monthly) }) : "–"}
                        </td>
                        <td className="px-2.5 py-3 whitespace-nowrap text-ink-2">{formatDay(plan.plannedOn, "d MMM yy", fmt)}</td>
                        <td className="py-3 pr-4 pl-1.5">
                          {canManage && (
                            <span className="flex items-center justify-end gap-1.5">
                              <Link href={startHref(plan)} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold whitespace-nowrap text-white" style={{ background: colorButton(c).background }}>
                                <Play className="size-2.75 fill-current" strokeWidth={0} aria-hidden="true" />
                                {t("Start")}
                              </Link>
                              <button type="button" onClick={() => setModal({ kind: "form", id: plan.id })} aria-label={t("Edit {name}", { name: plan.name })} title={t("Edit plan@@savings")} className={cn(iconActionClass(), "size-8 rounded-[9px]")}>
                                <PencilLine aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setModal({ kind: "delete", id: plan.id })}
                                aria-label={t("Delete {name}", { name: plan.name })}
                                title={t("Delete plan@@savings")}
                                className={cn(iconActionClass(), "size-8 rounded-[9px] text-expense hover:border-expense-line hover:bg-expense-soft")}
                              >
                                <Trash2 aria-hidden="true" />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <PlanFormDialog
        open={modal?.kind === "form"}
        onClose={close}
        businessId={businessId}
        editing={modal?.kind === "form" ? current : null}
        usedColors={plans.map((plan) => plan.color)}
        currency={currency}
        today={today}
        onSaved={saved}
      />
      <PopupDialog
        open={modal?.kind === "delete"}
        onClose={close}
        plain
        width={420}
        busy={isPending}
        className="leading-[normal]"
        titleClassName="font-bold!"
        lead={
          <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-[12px] bg-expense-soft text-expense">
            <Trash2 className="size-5" strokeWidth={2} />
          </span>
        }
        title={t("Delete this plan?")}
        sub={current ? t("{name} is removed from your plans. No money is touched.", { name: current.name }) : ""}
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={close} disabled={isPending} className="px-4.5">
              {t("Cancel")}
            </Button>
            <Button variant="danger" size="lg" onClick={() => current && remove(current)} disabled={isPending} className="shadow-none">
              {t("Delete plan@@savings")}
            </Button>
          </>
        }
      />
    </PageFrame>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18" />
    </svg>
  );
}
