"use client";

import { ChartPie, ChevronRight, Download, FileText, KeyRound, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { SOFT_TONE } from "@/components/smartly/tones";
import { formatDate } from "@/lib/customer/date";
import { APP_VERSION, GUIDES, LEGAL_LINKS, type Guide } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const GUIDE_ICONS: Record<Guide["faqId"], LucideIcon> = { transfer: Wallet, void: ChartPie, group: Users, vault: KeyRound };

interface ResourcesSectionProps {
  // When each legal page was last saved; null when it couldn't be read.
  legalUpdated: Record<string, string | null>;
}

// Short guides, the legal pages, the customer's data and the version.
export function ResourcesSection({ legalUpdated }: ResourcesSectionProps) {
  const { t } = useLocale();
  return (
    <div className="flex max-w-205 flex-col gap-4">
      <Card padding="none" className="flex flex-col gap-4 p-5">
        <h2 className="text-title font-semibold text-ink">{t("Guides")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map((guide) => {
            const Icon = GUIDE_ICONS[guide.faqId] ?? Wallet;
            return (
              <Link key={guide.title} href={`/settings/help?open=${guide.faqId}`} className="flex gap-3 rounded-lg border border-line p-4 text-ink hover:border-line-strong">
                <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-md", SOFT_TONE[guide.tone])}>
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.75">
                  <span className="text-body font-semibold">{t(guide.title)}</span>
                  <span className="text-small leading-normal text-ink-muted">{t(guide.body)}</span>
                  <span className="text-caption text-ink-muted">{t("{count} min read", { count: guide.minutes })}</span>
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
            <a key={link.page} href={`/${link.page}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 border-t border-divider px-5 py-3 text-ink hover:bg-hover">
              <FileText className="size-4.5 text-ink-muted" aria-hidden="true" />
              <span className="flex-1 text-body font-medium">{t(link.title)}</span>
              {updated && <span className="text-small text-ink-muted">{t("Updated {date}", { date: formatDate(updated) })}</span>}
              <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
            </a>
          );
        })}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="px-5 py-4 text-title font-semibold text-ink">{t("Your data")}</h2>
        <div className="flex flex-col gap-3 border-t border-divider px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-semibold text-ink">{t("Download my data")}</span>
            <span className="text-small leading-normal text-ink-muted">{t("Wallets, transactions, budgets, savings, assets, loans and groups as spreadsheet files. Saved passwords are left out.")}</span>
          </span>
          <Button asChild variant="secondary" className="h-9.5 shrink-0">
            <a href="/api/account-export" download>
              <Download className="size-4" aria-hidden="true" />
              {t("Download")}
            </a>
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-t border-divider bg-expense-soft/60 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 text-body font-semibold text-expense">
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

      <p className="text-small text-ink-muted">
        Smartly {t("for web")} · {t("version")} {APP_VERSION}
      </p>
    </div>
  );
}
