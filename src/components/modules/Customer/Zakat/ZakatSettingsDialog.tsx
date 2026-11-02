"use client";

import { useState, useTransition } from "react";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ChoiceCard, { ChoiceCardGroup } from "@/components/smartly/ChoiceCard";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { currencySymbol } from "@/lib/customer/currency";
import { saveZakatSettingsAction } from "@/lib/customer/zakatActions";
import { cleanPrice, NISAB_GOLD_VORI, NISAB_SILVER_VORI, nisabFor, pricesOk } from "@/lib/customer/zakatDisplay";
import type { ZakatBasis, ZakatDateMode, ZakatSummary } from "@/lib/customer/zakatTypes";
import { formatDay } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ZakatSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  summary: ZakatSummary;
  currency: string;
  money: (value: number | string) => string;
  onSaved: (summary: ZakatSummary, message: string) => void;
}

// Zakat settings (board: ZakatSettings): which nisab (silver, most used, or
// gold), when the zakat year is due (1 Ramadan, 1 Muharram or one's own
// date), and the prices per vori, BAJUS's unless changed.
export function ZakatSettingsDialog({ open, onClose, businessId, summary, currency, money, onSaved }: ZakatSettingsDialogProps) {
  const { t, fmt } = useLocale();
  const [basis, setBasis] = useState<ZakatBasis>("SILVER");
  const [dateMode, setDateMode] = useState<ZakatDateMode>("RAMADAN");
  const [customDate, setCustomDate] = useState("");
  const [gold, setGold] = useState("");
  const [silver, setSilver] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // The saved choices each time it opens.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setBasis(summary.settings.basis);
      setDateMode(summary.settings.dateMode);
      setCustomDate(summary.settings.customDate ?? "");
      setGold(String(summary.prices.gold22));
      setSilver(String(summary.prices.silver22));
      setTried(false);
      setError("");
    }
  }

  const platform = summary.prices.platform;
  const goldPrice = Number(gold) || 0;
  const silverPrice = Number(silver) || 0;
  const priceBad = !pricesOk(goldPrice, silverPrice);
  const dateMissing = dateMode === "CUSTOM" && !customDate;
  const choiceLabel = (mode: "RAMADAN" | "MUHARRAM") => {
    const choice = summary.dateChoices[mode];
    return t(mode === "RAMADAN" ? "1 Ramadan (about {date})" : "1 Muharram (about {date})", { date: formatDay(choice.date, "d MMM yyyy", fmt) });
  };

  function save() {
    if (isPending) return;
    if (priceBad || dateMissing) {
      setTried(true);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await saveZakatSettingsAction(businessId, {
        basis,
        dateMode,
        ...(dateMode === "CUSTOM" && { customDate }),
        // The platform's price is kept as "none of my own", so a newer BAJUS
        // price reaches this member once an admin enters it.
        goldPrice: goldPrice === platform.gold22 ? null : goldPrice,
        silverPrice: silverPrice === platform.silver22 ? null : silverPrice,
      }).catch(() => null);
      if (result?.success && result.data) onSaved(result.data, "Saved. Zakat worked out again.");
      else setError(t(result?.message ?? "Couldn't save the settings."));
    });
  }

  const priceField = (id: string, label: string, value: string, set: (value: string) => void) => (
    <Field htmlFor={id} label={<span className="text-small font-normal text-ink-2">{label}</span>}>
      <Input
        id={id}
        size="md"
        inputMode="numeric"
        value={toLocaleDigits(value, fmt)}
        onChange={(event) => set(cleanPrice(event.target.value))}
        invalid={tried && priceBad}
        leading={<span className="flex h-11 w-10 items-center justify-center border-r border-line bg-strip font-semibold text-ink-soft">{currencySymbol(currency)}</span>}
        frameClassName="gap-0 overflow-hidden pl-0"
        className="pl-3 tabular-nums"
      />
    </Field>
  );

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={560}
      title={t("Zakat settings")}
      sub={t("These change how your zakat is worked out.")}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      bodyClassName="gap-4.5"
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              setGold(String(platform.gold22));
              setSilver(String(platform.silver22));
            }}
            className="mr-auto rounded-sm text-[13.5px] font-semibold text-emerald hover:underline"
          >
            {t("Use today's BAJUS price")}
          </button>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Saving...")} />}
            {t("Save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <span id="zk-basis" className="text-body font-semibold text-ink">
          {t("Which nisab do you follow?")}
        </span>
        <ChoiceCardGroup aria-labelledby="zk-basis" className="flex flex-col gap-2">
          {(["SILVER", "GOLD"] as const).map((each) => {
            const silverBasis = each === "SILVER";
            const nisab = nisabFor(each, goldPrice || summary.prices.gold22, silverPrice || summary.prices.silver22);
            return (
              <ChoiceCard
                key={each}
                checked={basis === each}
                onSelect={() => setBasis(each)}
                title={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body font-semibold text-ink">
                    {silverBasis
                      ? t("Silver: {vori} vori", { vori: toLocaleDigits(String(NISAB_SILVER_VORI), fmt) })
                      : t("Gold: {vori} vori", { vori: toLocaleDigits(String(NISAB_GOLD_VORI), fmt) })}
                    {silverBasis && <span className="rounded-full bg-mint-50 px-2 py-px text-[11px] font-semibold text-brand-ink">{t("Most used")}</span>}
                    <span className="font-bold tabular-nums">· {money(nisab)}</span>
                  </span>
                }
                sub={
                  <span className="text-[12.5px] leading-normal text-ink-muted">
                    {t(silverBasis ? "The lower amount, so more people give. Many scholars in Bangladesh use it." : "A much higher amount. Pick it only if your scholar told you to.")}
                  </span>
                }
              />
            );
          })}
        </ChoiceCardGroup>
      </div>

      <Field htmlFor="zk-date" label={<span className="font-semibold">{t("When is your zakat year due?")}</span>} hint={t("Zakat is due once your money has stayed above nisab for one lunar year. Most people pick a date in Ramadan.")}>
        <div className="flex flex-col gap-2">
          <NativeSelect id="zk-date" size="md" value={dateMode} onChange={(event) => setDateMode(event.target.value as ZakatDateMode)}>
            <option value="RAMADAN">{choiceLabel("RAMADAN")}</option>
            <option value="MUHARRAM">{choiceLabel("MUHARRAM")}</option>
            <option value="CUSTOM">{t("My own date")}</option>
          </NativeSelect>
          {dateMode === "CUSTOM" && (
            <DayInput id="zk-custom-date" size="md" value={customDate} onChange={setCustomDate} min={summary.today} invalid={tried && dateMissing} placeholder={t("Pick a date")} />
          )}
          {tried && dateMissing && (
            <p role="alert" className="text-caption text-expense">
              {t("Pick your own date")}
            </p>
          )}
        </div>
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-body font-semibold text-ink">{t("Price per vori")}</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {priceField("zk-gold", t("Gold, 22 karat"), gold, setGold)}
          {priceField("zk-silver", t("Silver, 22 karat"), silver, setSilver)}
        </div>
        <p className="text-[12.5px] text-ink-muted">{t("BAJUS price from {date}. Change it if the price has moved.", { date: formatDay(platform.on, "d MMM yyyy", fmt) })}</p>
        {tried && priceBad && (
          <p role="alert" className="text-[12.5px] text-expense">
            {t("Check the prices. Gold or silver looks too low.")}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-field bg-expense-soft px-3.5 py-2.5 text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
