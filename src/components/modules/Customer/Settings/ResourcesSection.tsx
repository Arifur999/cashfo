"use client";

import { ChartPie, Download, ExternalLink, FileText, KeyRound, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { SOFT_TONE } from "@/components/smartly/tones";
import { formatDate } from "@/lib/customer/date";
import { APP_VERSION, fileNameFrom, GUIDES, LEGAL_LINKS, type Guide } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { toLocaleDigits } from "@/lib/i18n/digits";

const GUIDE_ICONS: Record<Guide["faqId"], LucideIcon> = { start: Wallet, budget: ChartPie, group: Users, vault: KeyRound };

// What the export is saved as when the answer names no file.
const EXPORT_FILE = "smartly-data.zip";

interface ResourcesSectionProps {
  // When each legal page was last saved; null when it couldn't be read.
  legalUpdated: Record<string, string | null>;
}

// Short guides, the legal pages, the customer's data and the version.
export function ResourcesSection({ legalUpdated }: ResourcesSectionProps) {
  const { t, locale } = useLocale();
  const [preparing, setPreparing] = useState(false);

  // The zip takes a moment to build: the button says so while it does, and
  // a refusal (three downloads a minute at most) or a failure is said in a
  // toast instead of a broken download in the browser's bar.
  async function download() {
    if (preparing) return;
    setPreparing(true);
    try {
      const response = await fetch("/api/account-export", { cache: "no-store" });
      if (!response.ok) {
        toast.error(response.status === 429 ? t("You just downloaded your data. Try again in a minute.") : t("Couldn't prepare your file. Try again."));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFrom(response.headers.get("content-disposition")) ?? EXPORT_FILE;
      document.body.append(link);
      link.click();
      link.remove();
      // Some browsers start reading the file only after the click returns.
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast.error(t("Couldn't prepare your file. Try again."));
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="flex max-w-205 flex-col gap-4">
      <Card padding="none" className="flex flex-col gap-4 p-5">
        <h2 className="text-title font-semibold text-ink">{t("Guides")}</h2>
        <div className="grid gap-3 @lg:grid-cols-2">
          {GUIDES.map((guide) => {
            const Icon = GUIDE_ICONS[guide.faqId] ?? Wallet;
            return (
              // Each opens the Help answer it is about.
              <Link key={guide.title} href={`/settings/help?open=${guide.faqId}`} className="flex gap-3 rounded-lg border border-line p-4 text-ink hover:border-line-strong hover:bg-hover">
                <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-md", SOFT_TONE[guide.tone])}>
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.75">
                  <span className="text-body font-semibold">{t(guide.title)}</span>
                  <span className="text-small leading-normal text-ink-muted">{t(guide.body)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="px-5 py-4 text-title font-semibold text-ink">{t("Legal")}</h2>
        {LEGAL_LINKS.map((link) => {
          const updated = legalUpdated[link.page];
          return (
            // A new tab, and it says so; the ring is drawn inside the card's clip.
            <a key={link.page} href={`/${link.page}`} target="_blank" rel="noopener noreferrer" className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-t border-divider px-5 py-3 text-ink hover:bg-hover focus-visible:-outline-offset-2">
              <FileText className="size-4.5 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-body font-medium">
                {t(link.title)}
                <span className="sr-only"> ({t("opens in a new tab")})</span>
              </span>
              {updated && <span className="text-small text-ink-muted">{t("Updated {date}", { date: formatDate(updated, undefined, locale) })}</span>}
              <ExternalLink className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            </a>
          );
        })}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="px-5 py-4 text-title font-semibold text-ink">{t("Your data")}</h2>
        <div className="flex flex-col gap-3 border-t border-divider px-5 py-4 @lg:flex-row @lg:items-center @lg:gap-5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-semibold text-ink">{t("Download my data")}</span>
            <span className="text-small leading-normal text-ink-muted">{t("Wallets, transactions, budgets, savings, assets, loans and groups as spreadsheet files. Saved passwords are left out.")}</span>
          </span>
          <Button variant="secondary" onClick={() => void download()} disabled={preparing} aria-busy={preparing || undefined} className="h-9.5 shrink-0 pointer-coarse:h-11">
            {preparing ? <Loader size={16} /> : <Download className="size-4" aria-hidden="true" />}
            {preparing ? t("Preparing your file...") : t("Download")}
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-t border-divider bg-expense-soft/60 px-5 py-4 @lg:flex-row @lg:items-center @lg:gap-5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-expense">
              {t("Delete my account")}
              <Chip tone="neutral" size="sm">
                {t("Coming soon")}
              </Chip>
            </span>
            <span className="text-small leading-normal text-ink-2">{t("Removes your account and everything in it. You have 7 days to change your mind.")}</span>
          </span>
          <Button variant="secondary" disabled className="h-9.5 shrink-0 border-expense text-expense">
            {t("Delete account")}
          </Button>
        </div>
      </Card>

      <p className="text-small text-ink-muted">{t("Smartly for web · version {version}", { version: toLocaleDigits(APP_VERSION, locale) })}</p>
    </div>
  );
}
