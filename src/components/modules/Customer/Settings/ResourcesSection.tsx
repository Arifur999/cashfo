"use client";

import { BookOpen, ChevronRight, FileText, KeyRound, Target, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import { SOFT_TONE } from "@/components/smartly/tones";
import { APP_VERSION, GUIDES, LEGAL_LINKS, type Guide } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const GUIDE_ICONS: Record<Guide["faqId"], LucideIcon> = { transfer: BookOpen, void: Target, group: Users, vault: KeyRound };

// Short guides, the legal pages and the version.
export function ResourcesSection() {
  const { t } = useLocale();
  return (
    <div className="flex max-w-205 flex-col gap-4">
      <Card padding="none" className="flex flex-col gap-4 p-5">
        <h2 className="text-title font-semibold text-ink">{t("Guides")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map((guide) => {
            const Icon = GUIDE_ICONS[guide.faqId] ?? BookOpen;
            return (
              <Link key={guide.title} href={`/settings/help?open=${guide.faqId}`} className="flex gap-3 rounded-lg border border-line p-4 text-ink hover:border-line-strong">
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
        {LEGAL_LINKS.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 border-t border-surface-sunken px-5 py-3 text-ink hover:bg-cream/60">
            <FileText className="size-4.5 text-ink-muted" aria-hidden="true" />
            <span className="flex-1 text-body font-medium">{t(link.title)}</span>
            <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
          </a>
        ))}
      </Card>

      <p className="text-small text-ink-muted">
        Smartly {t("for web")} · {t("version")} {APP_VERSION}
      </p>
    </div>
  );
}
