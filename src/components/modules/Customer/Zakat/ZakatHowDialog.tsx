"use client";

import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Button from "@/components/smartly/Button";
import { HOW_STEPS } from "@/lib/customer/zakatDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ZAKAT_POPUP } from "./zakatPopup";

interface ZakatHowDialogProps {
  open: boolean;
  onClose: () => void;
}

// How it works (board: Zakat's How popup): what nisab is, the five steps
// from what you have to the 2.5%, and that this is a guide.
export function ZakatHowDialog({ open, onClose }: ZakatHowDialogProps) {
  const { t, fmt } = useLocale();
  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={560}
      title={<span className="block leading-[normal]">{t("How your zakat is worked out")}</span>}
      {...ZAKAT_POPUP}
      headClassName="items-center border-b-0 px-6 pt-5.5 pb-0"
      bodyClassName="gap-3.5 px-6 pt-3.5 pb-0"
      footer={
        <Button onClick={onClose} className="h-10.5 w-full">
          {t("Got it")}
        </Button>
      }
      footerClassName="justify-stretch border-t-0 bg-surface px-6 pt-3.5 pb-5.5"
    >
      <p className="rounded-[12px] bg-primary-soft px-3.5 py-3 text-small leading-[1.55] text-brand-ink">
        <b>{t("Nisab")}</b> {t("is the least wealth on which zakat is due. If what you own after debts is below it, you give no zakat this year.")}
      </p>
      <ol className="flex flex-col gap-3">
        {HOW_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-mint-50 text-[13px] font-bold text-brand-ink">{formatCount(index + 1, fmt)}</span>
            <span className="flex flex-col gap-0.5">
              <b className="text-body font-semibold text-ink">{t(step.title)}</b>
              <span className="text-small leading-normal text-ink-2">{t(step.body)}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="rounded-[12px] bg-warning-soft px-3.5 py-3 text-[12.5px] leading-normal text-due-ink">{t("This is a guide built from your own records. For special cases, like business stock or shared property, ask a scholar you trust.")}</p>
    </PopupDialog>
  );
}
