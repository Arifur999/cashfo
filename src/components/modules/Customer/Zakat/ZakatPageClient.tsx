"use client";

import { CircleHelp, HandCoins, Plus, RotateCw, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import StatePanel from "@/components/smartly/StatePanel";
import { formatCurrency } from "@/lib/customer/currency";
import {
  addZakatExtraAction,
  deleteZakatPaymentAction,
  recordZakatAction,
  removeZakatExtraAction,
  setZakatCheckedAction,
  setZakatDebtModeAction,
  setZakatForSaleAction,
  setZakatLineAction,
  type ZakatResult,
} from "@/lib/customer/zakatActions";
import { lineName, nextUnchecked } from "@/lib/customer/zakatDisplay";
import type { ZakatCheckStep, ZakatDebtMode, ZakatLine, ZakatPayment, ZakatStepId, ZakatSummary } from "@/lib/customer/zakatTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ZakatAddDialog, type AddTarget } from "./ZakatAddDialog";
import { ZakatHero } from "./ZakatHero";
import { ZakatHowDialog } from "./ZakatHowDialog";
import { ZakatPayDialog } from "./ZakatPayDialog";
import { ZakatSettingsDialog } from "./ZakatSettingsDialog";
import { ZakatSide } from "./ZakatSide";
import { ZakatSteps } from "./ZakatSteps";

interface ZakatPageClientProps {
  businessId: string;
  // null: it couldn't be read, or the member may not see it.
  summary: ZakatSummary | null;
  canSee: boolean;
  currency: string;
  readOnly: boolean;
}

type Modal = "settings" | "pay" | "how" | null;

// The board's main: 24px 32px 40px, 18px between blocks, its text at
// normal line height.
const FRAME = "gap-[18px] leading-[normal] md:pt-6 md:pb-10";

// The Zakat calculator (board: Zakat). Every change answers the summary
// worked out afresh, which replaces the one on screen. One change runs at
// a time, so an older answer can never land over a newer one.
export function ZakatPageClient({ businessId, summary: initial, canSee, currency, readOnly }: ZakatPageClientProps) {
  const { t, fmt, locale } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const [summary, setSummary] = useState(initial);
  const [openStep, setOpenStep] = useState<ZakatStepId | null>(() => (initial ? nextUnchecked(initial, null) : null));
  const [modal, setModal] = useState<Modal>(null);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  // Set at once on a click, before React draws the pending state, so a
  // double click can't start a second change.
  const running = useRef(false);
  const [isRefreshing, startRefresh] = useTransition();

  // A fresh read from the server (another workspace opened, a refresh).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setSummary(initial);
  }

  if (!canSee) {
    return (
      <PageFrame className={FRAME}>
        <PageHeader title={t("Zakat calculator")} />
        <StatePanel icon={<HandCoins />} title={t("Only the owner or an accountant sees zakat")} description={t("Zakat is worked out from this workspace's money. Ask its owner, or open your own workspace.")} />
      </PageFrame>
    );
  }
  if (!summary) {
    return (
      <PageFrame className={FRAME}>
        <PageHeader title={t("Zakat calculator")} />
        <StatePanel
          icon={<HandCoins />}
          tone="warning"
          title={t("Couldn't load your zakat.")}
          description={t("Check your connection and try again.")}
          action={
            <Button variant="secondary" disabled={isRefreshing} onClick={() => startRefresh(() => router.refresh())}>
              <RotateCw />
              {t("Try again")}
            </Button>
          }
        />
      </PageFrame>
    );
  }

  // Runs one change; its answer replaces the summary. Returns it, or null
  // after saying what went wrong.
  async function run(key: string, call: () => Promise<ZakatResult>, fallback: string): Promise<ZakatSummary | null> {
    if (running.current) return null;
    running.current = true;
    setPending(key);
    try {
      const result = await call().catch(() => null);
      if (result?.success && result.data) {
        setSummary(result.data);
        return result.data;
      }
      toast.error(t(result?.message ?? fallback));
      return null;
    } finally {
      running.current = false;
      setPending(null);
    }
  }
  const idle = () => !running.current && !readOnly;

  const onToggleLine = (line: ZakatLine) => {
    if (idle()) void run(line.key, () => setZakatLineAction(businessId, line.key, !line.counted), "Couldn't change this line.");
  };
  const onDebtMode = (line: ZakatLine, mode: ZakatDebtMode) => {
    if (idle()) void run(line.key, () => setZakatDebtModeAction(businessId, line.id, mode), "Couldn't change this debt.");
  };
  const onForSale = async (line: ZakatLine, forSale: boolean) => {
    if (!idle()) return;
    const next = await run(line.key, () => setZakatForSaleAction(businessId, line.id, forSale), "Couldn't change this asset.");
    if (next) toast.success(t(forSale ? "Moved to Investments" : "Not counted now"));
  };
  const onRemoveExtra = async (line: ZakatLine, step: ZakatStepId) => {
    if (!idle() || step === "NOT_COUNTED") return;
    const next = await run(line.key, () => removeZakatExtraAction(businessId, line.id), "Couldn't remove it.");
    if (!next) return;
    // Undo adds it back as it was.
    const again =
      line.metal && line.weightVori
        ? { group: step, name: line.name, metal: line.metal, weightVori: Number(line.weightVori) }
        : { group: step, name: line.name, amount: Number(line.amount) };
    toast.success(t("Removed"), { action: { label: t("Undo@@zakat"), onClick: () => void run(`undo:${line.key}`, () => addZakatExtraAction(businessId, again), "Couldn't add it.") } });
  };
  const onCheck = async (step: ZakatCheckStep, checked: boolean) => {
    if (!idle()) return;
    const next = await run(`step:${step}`, () => setZakatCheckedAction(businessId, step, checked), "Couldn't save this step.");
    if (!next || !checked) return;
    const following = nextUnchecked(next, step);
    setOpenStep(following);
    if (!following) toast.success(t("All checked. Your zakat is ready."));
  };
  const onDeletePayment = async (payment: ZakatPayment) => {
    if (!idle()) return;
    const next = await run(`payment:${payment.id}`, () => deleteZakatPaymentAction(businessId, payment.id), "Couldn't delete this entry.");
    if (!next) return;
    // Undo records it again: a new expense from the same wallet.
    const again = { amount: Number(payment.amount), paidOn: payment.paidOn, accountId: payment.accountId, ...(payment.givenTo && { givenTo: payment.givenTo }) };
    toast.success(t("Entry deleted@@zakat"), {
      description: t("Its expense was taken back too."),
      action: { label: t("Undo@@zakat"), onClick: () => void run(`undo:${payment.id}`, () => recordZakatAction(businessId, again), "Couldn't save the zakat you gave.") },
    });
  };

  // A popup saved: its answer replaces the summary.
  const onSaved = (next: ZakatSummary, message: string) => {
    setSummary(next);
    setModal(null);
    if (addTarget) setOpenStep(addTarget.kind === "weigh" ? "GOLD" : addTarget.step);
    setAddTarget(null);
    toast.success(t(message));
  };

  const cashLines = summary.steps.find((step) => step.step === "CASH")?.lines ?? [];
  const walletName = (id: string) => {
    const line = cashLines.find((each) => each.source === "ACCOUNT" && each.id === id);
    return line ? lineName(line, t, locale === "bn") : "";
  };

  return (
    <PageFrame className={FRAME}>
      <PageHeader
        title={t("Zakat calculator")}
        description={t("We add up what you have from your own records. Check each step, then record what you give.")}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setModal("how")} className="gap-1.75 px-3.5">
              <CircleHelp className="text-ink-2" />
              {t("How it works@@zakat")}
            </Button>
            {!readOnly && (
              <>
                <Button variant="secondary" onClick={() => setModal("settings")} className="gap-1.75 px-3.5">
                  <SlidersHorizontal className="text-ink-2" />
                  {t("Settings")}
                </Button>
                <Button onClick={() => setModal("pay")} className="gap-1.75 px-4.5">
                  <Plus strokeWidth={2.25} />
                  {t("Record zakat given")}
                </Button>
              </>
            )}
          </div>
        }
      />

      <ZakatHero summary={summary} money={money} onHow={() => setModal("how")} />

      <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_350px]">
        <ZakatSteps
          summary={summary}
          money={money}
          openStep={openStep}
          onOpen={setOpenStep}
          pending={pending}
          readOnly={readOnly}
          onToggleLine={onToggleLine}
          onDebtMode={onDebtMode}
          onForSale={(line, forSale) => void onForSale(line, forSale)}
          onWeigh={(line) => !readOnly && setAddTarget({ kind: "weigh", line })}
          onRemoveExtra={(line, step) => void onRemoveExtra(line, step)}
          onAdd={(step) => !readOnly && setAddTarget({ kind: "extra", step })}
          onCheck={(step, checked) => void onCheck(step, checked)}
        />
        <ZakatSide
          summary={summary}
          money={money}
          walletName={walletName}
          onRecord={() => setModal("pay")}
          onDelete={(payment) => void onDeletePayment(payment)}
          pending={pending}
          readOnly={readOnly}
        />
      </div>

      <ZakatAddDialog target={addTarget} onClose={() => setAddTarget(null)} businessId={businessId} summary={summary} currency={currency} money={money} onSaved={onSaved} />
      <ZakatSettingsDialog open={modal === "settings"} onClose={() => setModal(null)} businessId={businessId} summary={summary} currency={currency} money={money} onSaved={onSaved} />
      <ZakatPayDialog open={modal === "pay"} onClose={() => setModal(null)} businessId={businessId} summary={summary} currency={currency} money={money} onSaved={onSaved} />
      <ZakatHowDialog open={modal === "how"} onClose={() => setModal(null)} />
    </PageFrame>
  );
}
