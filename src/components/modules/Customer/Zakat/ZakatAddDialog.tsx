"use client";

import { useState, useTransition } from "react";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { addZakatExtraAction, setZakatAssetWeightAction } from "@/lib/customer/zakatActions";
import { cleanVori, EXTRA_NAME_MAX, METAL_LABEL, METALS, metalValue, parseVori, STEP_META } from "@/lib/customer/zakatDisplay";
import type { ZakatCheckStep, ZakatLine, ZakatMetal, ZakatSummary } from "@/lib/customer/zakatTypes";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ZAKAT_POPUP } from "./zakatPopup";

// Add something not in the app to a step, or weigh a gold or silver asset.
export type AddTarget = { kind: "extra"; step: ZakatCheckStep } | { kind: "weigh"; line: ZakatLine };

interface ZakatAddDialogProps {
  target: AddTarget | null;
  onClose: () => void;
  businessId: string;
  summary: ZakatSummary;
  currency: string;
  money: (value: number | string) => string;
  // The fresh summary, and what to say.
  onSaved: (summary: ZakatSummary, message: string) => void;
}

// The Add popup (board: ZakatAdd): a name (or one of the suggestions), and
// an amount, or for gold and silver the metal and the weight in vori with
// its worth at today's price. The same popup weighs an asset from Assets,
// so it is valued at today's price instead of the value written there.
export function ZakatAddDialog({ target, onClose, businessId, summary, currency, money, onSaved }: ZakatAddDialogProps) {
  const { t, fmt } = useLocale();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [metal, setMetal] = useState<ZakatMetal>("GOLD_22");
  const [vori, setVori] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // A fresh form each time it opens, a weighed asset's own figures first.
  const [prevTarget, setPrevTarget] = useState<AddTarget | null>(null);
  if (target !== prevTarget) {
    setPrevTarget(target);
    if (target) {
      const line = target.kind === "weigh" ? target.line : null;
      setName("");
      setAmount("");
      setMetal(line?.metal ?? "GOLD_22");
      setVori(line?.weightVori ?? "");
      setTried(false);
      setError("");
    }
  }

  if (!target) return null;
  // The asset being weighed, else null for something added.
  const weighed = target.kind === "weigh" ? target.line : null;
  const weigh = weighed !== null;
  const step: ZakatCheckStep = target.kind === "weigh" ? "GOLD" : target.step;
  const meta = STEP_META[step];
  const isMetal = step === "GOLD";
  const weight = parseVori(vori);
  const worth = weight === null ? 0 : metalValue(weight, summary.prices.perVori[metal]);
  const value = isMetal ? worth : Number(amount) || 0;
  const nameError = !weigh && tried && !name.trim() ? t("Give it a name.") : "";
  const valueError = tried && !value ? t(isMetal ? "Type the weight in vori, like 1.5." : "Type the amount.") : "";

  function save() {
    if (isPending) return;
    if ((!weigh && !name.trim()) || !value) {
      setTried(true);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = weighed
        ? await setZakatAssetWeightAction(businessId, weighed.id, metal, weight).catch(() => null)
        : await addZakatExtraAction(businessId, isMetal ? { group: step, name: name.trim(), metal, weightVori: weight ?? 0 } : { group: step, name: name.trim(), amount: value }).catch(() => null);
      if (result?.success && result.data) onSaved(result.data, weigh ? "Weight saved. Zakat worked out again." : "Added. Zakat worked out again.");
      else setError(t(result?.message ?? (weigh ? "Couldn't save the weight." : "Couldn't add it.")));
    });
  }

  // Weighed by mistake: back to the value written in Assets.
  function backToAssetValue() {
    if (!weighed || isPending) return;
    startTransition(async () => {
      const result = await setZakatAssetWeightAction(businessId, weighed.id, null, null).catch(() => null);
      if (result?.success && result.data) onSaved(result.data, "Valued as in Assets again.");
      else setError(t(result?.message ?? "Couldn't save the weight."));
    });
  }

  const title = weighed ? t("Weigh {name}", { name: weighed.name }) : t("Add to {step}", { step: t(meta.title) });
  const sub = weigh ? t("Its weight values it at today's price. Assets keeps its own value.") : t("For things you have but did not put in the app.");

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={isPending}
      width={460}
      title={<span className="block leading-[normal]">{title}</span>}
      sub={sub}
      {...ZAKAT_POPUP}
      subClassName="text-[13px] leading-[1.45]"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          {weighed?.byWeight && (
            <button type="button" onClick={backToAssetValue} disabled={isPending} className="mr-auto rounded-sm text-[13.5px] font-semibold text-emerald hover:underline disabled:opacity-60">
              {t("Use the value in Assets")}
            </button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending} className="px-4.5">
            {isPending && <Loader size={16} onDark label={t("Saving...")} />}
            {t(weigh ? "Save" : "Add")}
          </Button>
        </>
      }
    >
      {!weigh && meta.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {meta.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setName(t(suggestion))}
              className="h-7.5 rounded-full border border-line bg-surface px-2.75 text-[12.5px] font-semibold text-ink-2 hover:bg-pick-wash pointer-coarse:h-11"
            >
              {t(suggestion)}
            </button>
          ))}
        </div>
      )}
      {!weigh && (
        <Field htmlFor="zk-add-name" label={t("What is it?")} error={nameError}>
          <Input id="zk-add-name" size="md" value={name} onChange={(event) => setName(event.target.value)} maxLength={EXTRA_NAME_MAX} placeholder={meta.suggestions[0] ? t(meta.suggestions[0]) : ""} invalid={Boolean(nameError)} autoFocus />
        </Field>
      )}
      {isMetal ? (
        <>
          <div className="grid gap-3 sm:grid-cols-[1.55fr_1fr]">
            <Field htmlFor="zk-add-metal" label={t("Type")}>
              <NativeSelect id="zk-add-metal" size="md" className="text-[13.5px] font-normal" value={metal} onChange={(event) => setMetal(event.target.value as ZakatMetal)}>
                {METALS.map((each) => (
                  <option key={each} value={each}>{`${t(METAL_LABEL[each])} · ${money(summary.prices.perVori[each])}`}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field htmlFor="zk-add-vori" label={t("Weight")} error={valueError}>
              <Input
                id="zk-add-vori"
                size="md"
                inputMode="decimal"
                value={toLocaleDigits(vori, fmt)}
                onChange={(event) => setVori(cleanVori(event.target.value))}
                placeholder={toLocaleDigits("1.5", fmt)}
                invalid={Boolean(valueError)}
                autoFocus={weigh}
                trailing={<span className="flex h-11 items-center border-l border-line bg-strip px-2.5 text-small font-semibold text-ink-2">{t("vori")}</span>}
                frameClassName="overflow-hidden pr-0"
                className="tabular-nums"
              />
            </Field>
          </div>
          <p className="text-[12.5px] text-ink-muted">
            {worth > 0 ? t("Worth {amount} at today's price", { amount: money(worth) }) : t("1 vori is {grams} grams", { grams: toLocaleDigits("11.664", fmt) })}
          </p>
        </>
      ) : (
        <Field htmlFor="zk-add-amount" label={t("Amount")} error={valueError}>
          <AmountInput id="zk-add-amount" size="lg" value={amount} onChange={setAmount} currency={currency} invalid={Boolean(valueError)} />
        </Field>
      )}
      {error && (
        <p role="alert" className="rounded-field bg-expense-soft px-3.5 py-2.5 text-small text-expense">
          {error}
        </p>
      )}
      <p className="rounded-[12px] bg-strip px-3 py-2.5 text-[12.5px] leading-normal text-ink-2">
        {t(weigh ? "This stays only on this page. Assets keeps the value you wrote there." : "This stays only on this page. It does not change your wallets, assets or loans.")}
      </p>
    </PopupDialog>
  );
}
