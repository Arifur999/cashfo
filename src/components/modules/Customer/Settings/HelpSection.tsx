"use client";

import { ChevronDown, ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import { FAQS, searchFaqs, SHORTCUTS } from "@/lib/customer/settingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface HelpSectionProps {
  // A question to open on arrival, from a guide.
  openId?: string;
}

// The questions people ask most, searchable, and the shortcuts.
export function HelpSection({ openId }: HelpSectionProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(openId ?? FAQS[0]?.id ?? null);
  const shown = searchFaqs(FAQS, query, t);

  return (
    <div className="flex flex-col gap-4">
      <Input size="xl" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search help, for example: void a transaction")} aria-label={t("Search help")} leading={<Search />} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <Card padding="none" className="overflow-hidden">
          <h2 className="px-5 py-4 text-title font-semibold text-ink">{t("Common questions")}</h2>
          {shown.length === 0 && <div className="border-t border-surface-sunken px-5 py-6 text-small text-ink-muted">{t("Nothing matches. Try other words.")}</div>}
          {shown.map((faq) => {
            const expanded = open === faq.id;
            return (
              <div key={faq.id} className={cn("border-t border-surface-sunken", expanded && "bg-mint-50/50")}>
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : faq.id)} className="flex min-h-13 w-full items-center gap-3 px-5 text-left">
                  <span className={cn("flex-1 text-body font-semibold", expanded ? "text-emerald" : "text-ink")}>{t(faq.question)}</span>
                  <ChevronDown className={cn("size-4.5 shrink-0 text-ink-muted transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                </button>
                {expanded && <p className="px-5 pb-4 text-body leading-relaxed text-ink-2">{t(faq.answer)}</p>}
              </div>
            );
          })}
        </Card>

        <div className="flex flex-col gap-4">
          <Card padding="none" elevated={false} className="flex flex-col gap-2 p-4">
            <h2 className="text-body font-semibold text-ink">{t("More answers")}</h2>
            <span className="text-small leading-normal text-ink-muted">{t("Every question we have answered, kept up to date.")}</span>
            <a href="/faq" target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-small font-semibold text-emerald hover:underline">
              {t("Open the FAQ")}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Card>
          <Card padding="none" elevated={false} className="flex flex-col gap-3 p-4">
            <h2 className="text-body font-semibold text-ink">{t("Keyboard shortcuts")}</h2>
            {SHORTCUTS.map((shortcut) => (
              <span key={shortcut.key} className="flex items-center justify-between text-small text-ink-2">
                {t(shortcut.what)}
                <kbd className="rounded-sm border border-b-2 border-line bg-cream px-2 py-0.5 font-sans text-caption font-semibold text-ink">{shortcut.key}</kbd>
              </span>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
