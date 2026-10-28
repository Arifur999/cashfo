"use client";

import { ChartPie, ChevronRight, Download, FileText, KeyRound, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { SOFT_TONE } from "@/components/smartly/tones";
import { formatDate } from "@/lib/customer/date";
import { APP_VERSION, fileNameFrom, GUIDES, LEGAL_LINKS, type Guide } from "@/lib/customer/settingsDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

const GUIDE_ICONS: Record<Guide["faqId"], LucideIcon> = { start: Wallet, budget: ChartPie, group: Users, vault: KeyRound };

// What the export is saved as when the answer names no file.
const EXPORT_FILE = "smartly-data.zip";

interface ResourcesSectionProps {
  // When each legal page was last saved; null when it couldn't be read.
  legalUpdated: Record<string, string | null>;
}

// Short guides, the legal pages, the customer's data and the version
// (design-v4 SettingsResources).
export function ResourcesSection({ legalUpdated }: ResourcesSectionProps) {
  const { t, fmt } = useLocale();
  const { user } = useAuth();
  const [preparing, setPreparing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const readOnly = Boolean(user.impersonatedBy);

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
    <div className="flex flex-col gap-4.5">
      <Card padding="none" className="flex flex-col gap-3.5 px-4 py-4.5 md:px-5">
        <h2 className="text-title font-semibold text-ink">{t("Guides")}</h2>
        <div className="grid gap-3 @lg:grid-cols-2">
          {GUIDES.map((guide) => {
            const Icon = GUIDE_ICONS[guide.faqId] ?? Wallet;
            return (
              // Each opens the Help answer it is about.
              <Link key={guide.title} href={`/settings/help?open=${guide.faqId}`} className="flex gap-3 rounded-md border border-line p-3.5 text-ink hover:border-line-strong hover:bg-hover">
                <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-field", guide.faqId === "start" ? "bg-emerald-soft text-emerald" : SOFT_TONE[guide.tone])}>
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.75">
                  <span className="text-body font-semibold">{t(guide.title)}</span>
                  <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t(guide.body)}</span>
                  <span className="text-caption text-ink-faint">{t("{count} min read", { count: formatCount(guide.minutes, fmt) })}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="px-4 py-4 text-title font-semibold text-ink md:px-5">{t("Legal")}</h2>
        {LEGAL_LINKS.map((link) => {
          const updated = legalUpdated[link.page];
          return (
            // A new tab, and it says so; the ring is drawn inside the card's clip.
            <a key={link.page} href={`/${link.page}`} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-divider px-4 py-3 text-ink hover:bg-hover focus-visible:-outline-offset-2 md:px-5">
              <FileText className="size-4.5 shrink-0 text-ink-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-body font-medium">
                {t(link.title)}
                <span className="sr-only"> ({t("opens in a new tab")})</span>
              </span>
              {updated && <span className="text-[12.5px] text-ink-muted">{t("Updated {date}", { date: formatDate(updated, undefined, fmt) })}</span>}
              <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
            </a>
          );
        })}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="px-4 py-4 text-title font-semibold text-ink md:px-5">{t("Your data")}</h2>
        <div className="flex flex-col gap-3 border-t border-divider px-4 py-3.5 @lg:flex-row @lg:items-center @lg:gap-3.5 md:px-5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-semibold text-ink">{t("Download my data")}</span>
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Wallets, transactions, budgets, savings, assets, loans and groups as spreadsheet files. Saved passwords are left out.")}</span>
          </span>
          <Button variant="secondary" onClick={() => void download()} disabled={preparing} aria-busy={preparing || undefined} className="h-9.5 shrink-0 self-start px-3.5 text-[13.5px] @lg:self-auto pointer-coarse:h-11">
            {preparing ? <Loader size={16} /> : <Download className="size-4" aria-hidden="true" />}
            {preparing ? t("Preparing your file...") : t("Download")}
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-t border-divider bg-expense-soft/25 px-4 py-3.5 @lg:flex-row @lg:items-center @lg:gap-3.5 md:px-5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-semibold text-expense">{t("Delete my account")}</span>
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Removes your account and everything in it. You have 30 days to change your mind.")}</span>
          </span>
          <Button variant="secondary" onClick={() => setDeleteOpen(true)} disabled={readOnly} className="h-9.5 shrink-0 self-start border-expense-line px-3.5 text-[13.5px] text-expense hover:bg-expense-soft @lg:self-auto pointer-coarse:h-11">
            {t("Delete account")}
          </Button>
        </div>
      </Card>

      <p className="text-[12.5px] text-ink-faint">{t("Smartly for web · version {version}", { version: toLocaleDigits(APP_VERSION, fmt) })}</p>

      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onDownload={() => void download()} />
    </div>
  );
}
