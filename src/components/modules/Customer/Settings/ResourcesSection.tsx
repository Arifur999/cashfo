"use client";

import { ArrowLeftRight, ArrowRight, ChartPie, ChevronRight, CircleHelp, Database, FileText, KeyRound, Leaf, Play, Share2, Star, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import { formatDate } from "@/lib/customer/date";
import { APP_VERSION, GUIDE_CATEGORY_LABEL, GUIDES, LEGAL_LINKS, LEGAL_SUMMARY, WHATS_NEW, type Guide, type GuideCategory } from "@/lib/customer/settingsDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./boardUi";
import { LicencesDialog, RateUsDialog } from "./ResourcesDialogs";
import { SettingsBack } from "./SettingsBack";

const GUIDE_LOOK: Record<Guide["faqId"], { Icon: LucideIcon; tile: string }> = {
  start: { Icon: Play, tile: "bg-mint-50 text-primary" },
  opening: { Icon: Wallet, tile: "bg-mint-50 text-primary" },
  budget: { Icon: ChartPie, tile: "bg-tint-blue text-tint-blue-ink" },
  loans: { Icon: ArrowLeftRight, tile: "bg-tint-blue text-tint-blue-ink" },
  group: { Icon: Users, tile: "bg-warning-soft text-warning" },
  vault: { Icon: KeyRound, tile: "bg-tint-pink text-tint-pink-ink" },
};

interface ResourcesSectionProps {
  // When each legal page was last saved; null when it couldn't be read.
  legalUpdated: Record<string, string | null>;
}

// The SettingsResources board: short guides by topic (each opens its Help
// answer), the legal pages, and about this version; downloading or
// deleting the account's data lives in Data & privacy now.
export function ResourcesSection({ legalUpdated }: ResourcesSectionProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const [category, setCategory] = useState<GuideCategory | "all">("all");
  const [dialog, setDialog] = useState<"rate" | "licences" | null>(null);
  // A super admin viewing as this customer can read but not send.
  const viewing = Boolean(user.impersonatedBy);
  const used = (Object.keys(GUIDE_CATEGORY_LABEL) as GuideCategory[]).filter((key) => GUIDES.some((guide) => guide.category === key));
  const shown = category === "all" ? GUIDES : GUIDES.filter((guide) => guide.category === category);

  // The phone's share sheet with the person's invite (their referral
  // link), else a copy of it.
  function share() {
    const code = user.profileCard?.code;
    const url = `${window.location.origin}${code ? `/register?ref=${encodeURIComponent(code)}` : ""}`;
    if (typeof navigator.share === "function") {
      void navigator.share({ title: "Smartly", text: t("Join me on Smartly"), url }).catch(() => undefined);
      return;
    }
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success(t("Link copied")))
      .catch(() => toast.error(t("Couldn't copy. Select the text and copy it yourself.")));
  }

  const pointer = (href: string, Icon: LucideIcon, title: string, body: string) => (
    <Link href={href} className={cn(CARD, "flex items-center gap-3.5 px-5 py-4 hover:border-primary/40")}>
      <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-page text-ink-2">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-semibold text-ink">{t(title)}</span>
        <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t(body)}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
    </Link>
  );

  return (
    <PageFrame className="gap-5.5 leading-[normal] md:pt-7 md:pb-10">
      <div className="flex flex-col gap-1">
        <SettingsBack />
        <h1 className="text-[26px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Resources & legal")}</h1>
        <p className="text-body text-ink-muted">{t("Short guides, our policies and everything about this version of Smartly.")}</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="@container flex min-w-0 flex-col gap-4.5">
          <section aria-labelledby="rs-guides" className={cn(CARD, "flex flex-col")}>
            <div className="flex flex-col px-5.5 pt-4.5 pb-3.5">
              <h2 id="rs-guides" className="text-[16px] leading-[1.35] font-semibold text-ink">
                {t("Guides")}
              </h2>
              <p className="mt-[3px] text-[13px] leading-[1.5] text-ink-muted">{t("Read one in a few minutes. Each ends with something you can do today.")}</p>
            </div>
            <div role="group" aria-label={t("Guides")} className="flex flex-wrap gap-2 px-5.5 pb-4">
              {(["all", ...used] as const).map((key) => {
                const count = key === "all" ? GUIDES.length : GUIDES.filter((guide) => guide.category === key).length;
                const on = category === key;
                return (
                  <button key={key} type="button" aria-pressed={on} onClick={() => setCategory(key)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3.25 text-[13px] font-medium", on ? "border-primary bg-primary text-white" : "border-line bg-surface text-ink-2 hover:border-mint-200 hover:bg-soft-row")}>
                    {t(key === "all" ? "All" : GUIDE_CATEGORY_LABEL[key])}
                    <span className="text-[11.5px] opacity-70">{formatCount(count, fmt)}</span>
                  </button>
                );
              })}
            </div>
            <ul className="grid grid-cols-1 gap-3 px-5.5 pb-5.5 sm:grid-cols-2 @xl:grid-cols-3">
              {shown.map((guide) => {
                const { Icon, tile } = GUIDE_LOOK[guide.faqId];
                return (
                  <li key={guide.title}>
                    <Link href={`/settings/help?open=${guide.faqId}`} className="flex h-full flex-col gap-2.5 rounded-[14px] border border-line p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-mint-200 hover:shadow-[0_6px_18px_rgba(18,32,29,0.07)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn("flex size-9.5 items-center justify-center rounded-[10px]", tile)}>
                          <Icon className="size-4.5" aria-hidden="true" />
                        </span>
                        <span className="inline-flex h-5 items-center rounded-full bg-page px-2 text-[11px] font-semibold whitespace-nowrap text-ink-2">{t(GUIDE_CATEGORY_LABEL[guide.category])}</span>
                      </span>
                      <span className="text-[14.5px] leading-[1.35] font-semibold text-ink">{t(guide.title)}</span>
                      <span className="flex-1 text-[12.5px] leading-[1.5] text-ink-muted">{t(guide.body)}</span>
                      <span className="flex items-center justify-between text-[12px]">
                        <span className="text-ink-faint">{t("{count} min read", { count: formatCount(guide.minutes, fmt) })}</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald">
                          {t("Read")}
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="rs-legal" className={cn(CARD, "overflow-hidden")}>
            <div className="flex flex-col px-5.5 pt-4.5 pb-3.5">
              <h2 id="rs-legal" className="text-[16px] leading-[1.35] font-semibold text-ink">
                {t("Legal")}
              </h2>
              <p className="mt-[3px] text-[13px] leading-[1.5] text-ink-muted">{t("The promises we make to you, in plain words.")}</p>
            </div>
            {LEGAL_LINKS.map((link) => {
              const updated = legalUpdated[link.page];
              return (
                // A new tab, and it says so; the ring is drawn inside the card's clip.
                <a key={link.page} href={`/${link.page}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 border-t border-sunken px-5.5 py-3.25 text-ink hover:bg-soft-row focus-visible:-outline-offset-2">
                  <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-page text-ink-2">
                    <FileText className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-body font-medium">
                      {t(link.title)}
                      <span className="sr-only"> ({t("opens in a new tab")})</span>
                    </span>
                    {LEGAL_SUMMARY[link.page] && <span className="truncate text-[12.5px] leading-[1.45] text-ink-muted">{t(LEGAL_SUMMARY[link.page])}</span>}
                  </span>
                  {updated && <span className="text-[12.5px] whitespace-nowrap text-ink-muted max-sm:hidden">{t("Updated {date}", { date: formatDate(updated, "d MMMM yyyy", fmt) })}</span>}
                  <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                </a>
              );
            })}
          </section>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-4">
          <section aria-labelledby="rs-about" className={cn(CARD, "flex flex-col gap-3.5 p-5")}>
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-soft-wash text-income">
                <Leaf className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-px">
                <h2 id="rs-about" className="text-[16px] leading-[1.35] font-semibold text-ink">
                  {t("About Smartly")}
                </h2>
                <span className="text-[12.5px] text-ink-muted">{t("Money Tracker for web · version {version}", { version: toLocaleDigits(APP_VERSION, fmt) })}</span>
              </span>
            </div>
            <div className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("What's new")}</span>
            <ul className="flex flex-col gap-2">
              {WHATS_NEW.map((line) => (
                <li key={line} className="flex gap-2.25 text-[13px] leading-[1.5] text-ink-2">
                  <span aria-hidden="true" className="mt-1.75 size-1.5 shrink-0 rounded-full bg-primary" />
                  {t(line)}
                </li>
              ))}
            </ul>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" className="h-9.5 rounded-full text-[13.5px]" disabled={viewing} onClick={() => setDialog("rate")}>
                <Star className="size-3.75" aria-hidden="true" />
                {t("Rate us")}
              </Button>
              <Button variant="secondary" size="sm" className="h-9.5 rounded-full text-[13.5px]" onClick={share}>
                <Share2 className="size-3.75" aria-hidden="true" />
                {t("Share the app")}
              </Button>
            </div>
            <button type="button" onClick={() => setDialog("licences")} className="self-start text-[13px] font-semibold text-emerald hover:underline">
              {t("Open-source licences")}
            </button>
          </section>
          {pointer("/settings/data", Database, "Export or delete your data", "Now in Data & privacy, with import and backups.")}
          {pointer("/settings/help", CircleHelp, "Still stuck?", "Videos, messages to our team and contact details.")}
        </div>
      </div>
      <RateUsDialog open={dialog === "rate"} onClose={() => setDialog(null)} />
      <LicencesDialog open={dialog === "licences"} onClose={() => setDialog(null)} />
    </PageFrame>
  );
}
